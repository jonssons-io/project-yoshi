import { type Transaction, TransactionType } from '@/api/generated/types.gen'
import type { ImportLookupItem, TransactionDraft } from '../types'
import { cleanBankDescription } from './bank-description'

/** Fields of an already saved transaction that the import learns from. */
export type HistoryTransaction = Pick<
  Transaction,
  | 'id'
  | 'name'
  | 'amount'
  | 'type'
  | 'account'
  | 'transferToAccount'
  | 'category'
  | 'budget'
  | 'recipient'
  | 'incomeSource'
  | 'billInstance'
  | 'incomeInstance'
  | 'splits'
  | 'createdAt'
> & {
  date: string | Date
}

type ExpenseMemory = {
  recipientId: string
  categoryId: string | null
  budgetId: string | null
}

type RecipientMemory = {
  categoryId: string | null
  budgetId: string | null
}

type IncomeMemory = {
  incomeSourceId: string
  categoryId: string | null
}

/**
 * What earlier transactions say about a vendor: the most recent choice wins,
 * so correcting a row once is enough for later imports.
 */
export type ImportHistoryIndex = {
  expenseByKey: Map<string, ExpenseMemory>
  expenseByRecipient: Map<string, RecipientMemory>
  incomeByKey: Map<string, IncomeMemory>
  incomeBySource: Map<
    string,
    {
      categoryId: string | null
    }
  >
  /** `in|out : origin account id : key` → the account on the other side. */
  transferCounterpartByKey: Map<string, string>
}

export type HistoryLookups = {
  recipients: ImportLookupItem[]
  incomeSources: ImportLookupItem[]
  categories: ImportLookupItem[]
  budgets?: ImportLookupItem[]
}

function timeOf(value: string | Date): number {
  const time = (value instanceof Date ? value : new Date(value)).getTime()
  return Number.isNaN(time) ? 0 : time
}

function newestFirst(transactions: HistoryTransaction[]): HistoryTransaction[] {
  const byId = new Map<string, HistoryTransaction>()
  for (const transaction of transactions) byId.set(transaction.id, transaction)

  return [
    ...byId.values()
  ].sort(
    (a, b) =>
      timeOf(b.date) - timeOf(a.date) ||
      timeOf(b.createdAt) - timeOf(a.createdAt)
  )
}

function transferKey(
  direction: 'in' | 'out',
  originAccountId: string,
  key: string
): string {
  return `${direction}:${originAccountId}:${key}`
}

export function buildImportHistoryIndex(
  transactions: HistoryTransaction[]
): ImportHistoryIndex {
  const index: ImportHistoryIndex = {
    expenseByKey: new Map(),
    expenseByRecipient: new Map(),
    incomeByKey: new Map(),
    incomeBySource: new Map(),
    transferCounterpartByKey: new Map()
  }

  for (const transaction of newestFirst(transactions)) {
    const key = cleanBankDescription(transaction.name).key
    // A split transaction has no single category or budget to copy.
    const isSplit = (transaction.splits?.length ?? 0) > 0
    const categoryId = isSplit ? null : (transaction.category?.id ?? null)
    const budgetId = isSplit ? null : (transaction.budget?.id ?? null)

    if (transaction.type === TransactionType.EXPENSE) {
      const recipientId = transaction.recipient?.id
      if (!recipientId) continue

      if (key && !index.expenseByKey.has(key)) {
        index.expenseByKey.set(key, {
          recipientId,
          categoryId,
          budgetId
        })
      }

      const known = index.expenseByRecipient.get(recipientId)
      index.expenseByRecipient.set(recipientId, {
        categoryId: known?.categoryId ?? categoryId,
        budgetId: known?.budgetId ?? budgetId
      })
      continue
    }

    if (transaction.type === TransactionType.INCOME) {
      const incomeSourceId = transaction.incomeSource?.id
      if (!incomeSourceId) continue

      if (key && !index.incomeByKey.has(key)) {
        index.incomeByKey.set(key, {
          incomeSourceId,
          categoryId
        })
      }

      const known = index.incomeBySource.get(incomeSourceId)
      index.incomeBySource.set(incomeSourceId, {
        categoryId: known?.categoryId ?? categoryId
      })
      continue
    }

    if (transaction.type === TransactionType.TRANSFER) {
      const fromId = transaction.account.id
      const toId = transaction.transferToAccount?.id
      if (!key || !toId) continue

      const outKey = transferKey('out', fromId, key)
      if (!index.transferCounterpartByKey.has(outKey)) {
        index.transferCounterpartByKey.set(outKey, toId)
      }
      const inKey = transferKey('in', toId, key)
      if (!index.transferCounterpartByKey.has(inKey)) {
        index.transferCounterpartByKey.set(inKey, fromId)
      }
    }
  }

  return index
}

function usableId(
  id: string | null | undefined,
  items: ImportLookupItem[] | undefined
): string {
  if (!id || !items) return ''
  const item = items.find((candidate) => candidate.id === id)
  return item && !item.archived ? item.id : ''
}

/**
 * Copies recipient/sender, category, and budget from the latest saved
 * transaction with the same vendor text. Archived or deleted choices are
 * skipped so the draft never points at something the user can no longer pick.
 */
export function applyHistoryByKey(
  draft: TransactionDraft,
  index: ImportHistoryIndex,
  lookups: HistoryLookups
): TransactionDraft {
  const key = cleanBankDescription(draft.originalDescription).key
  if (!key) return draft

  if (draft.type === TransactionType.EXPENSE) {
    const memory = index.expenseByKey.get(key)
    const recipientId = usableId(memory?.recipientId, lookups.recipients)
    if (!memory || !recipientId) return draft

    return {
      ...draft,
      recipientId,
      categoryId:
        usableId(memory.categoryId, lookups.categories) || draft.categoryId,
      budgetId: usableId(memory.budgetId, lookups.budgets) || draft.budgetId
    }
  }

  if (draft.type === TransactionType.INCOME) {
    const memory = index.incomeByKey.get(key)
    const incomeSourceId = usableId(
      memory?.incomeSourceId,
      lookups.incomeSources
    )
    if (!memory || !incomeSourceId) return draft

    return {
      ...draft,
      incomeSourceId,
      categoryId:
        usableId(memory.categoryId, lookups.categories) || draft.categoryId
    }
  }

  return draft
}

/**
 * Fills category and budget that are still empty from the latest transaction
 * to the same recipient (or from the same sender), whatever its bank text was.
 */
export function applyHistoryDefaults(
  draft: TransactionDraft,
  index: ImportHistoryIndex,
  lookups: HistoryLookups
): TransactionDraft {
  if (draft.type === TransactionType.EXPENSE && draft.recipientId) {
    const memory = index.expenseByRecipient.get(draft.recipientId)
    if (!memory) return draft

    return {
      ...draft,
      categoryId:
        draft.categoryId || usableId(memory.categoryId, lookups.categories),
      budgetId: draft.budgetId || usableId(memory.budgetId, lookups.budgets)
    }
  }

  if (draft.type === TransactionType.INCOME && draft.incomeSourceId) {
    const memory = index.incomeBySource.get(draft.incomeSourceId)
    if (!memory) return draft

    return {
      ...draft,
      categoryId:
        draft.categoryId || usableId(memory.categoryId, lookups.categories)
    }
  }

  return draft
}

/**
 * The account a transfer with this bank text went to or came from last time.
 * Falls back to the opposite direction, since money moved between the same two
 * accounts usually carries the same text both ways.
 */
export function findTransferCounterpartId(
  draft: Pick<TransactionDraft, 'originalDescription' | 'signedAmount'>,
  index: ImportHistoryIndex,
  accounts: ImportLookupItem[],
  originAccountId: string
): string {
  const key = cleanBankDescription(draft.originalDescription).key
  if (!key || !originAccountId) return ''

  const direction = draft.signedAmount > 0 ? 'in' : 'out'
  const opposite = direction === 'in' ? 'out' : 'in'
  const selectable = accounts.filter(
    (account) => account.id !== originAccountId
  )

  return (
    usableId(
      index.transferCounterpartByKey.get(
        transferKey(direction, originAccountId, key)
      ),
      selectable
    ) ||
    usableId(
      index.transferCounterpartByKey.get(
        transferKey(opposite, originAccountId, key)
      ),
      selectable
    )
  )
}
