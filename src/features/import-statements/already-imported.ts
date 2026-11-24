import { TransactionType } from '@/api/generated/types.gen'
import { cleanBankDescription } from './classification/bank-description'
import type { HistoryTransaction } from './classification/history-matching'
import type { TransactionDraft } from './types'

const MS_PER_DAY = 86_400_000
/**
 * Linking a row to a bill or income instance moves its date to the due date,
 * so those are matched within the same window instance matching uses.
 */
const INSTANCE_DATE_WINDOW_DAYS = 7

type Direction = 'in' | 'out'

type Candidate = {
  transaction: HistoryTransaction
  days: number[]
  linkedToInstance: boolean
  used: boolean
}

function dayFromParts(year: number, month: number, day: number): number {
  return Math.round(Date.UTC(year, month, day) / MS_PER_DAY)
}

function dayFromIsoDate(value: string | null | undefined): number | null {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null
  return dayFromParts(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

/**
 * Imported rows are saved at UTC midnight while rows entered by hand are saved
 * at local midnight, so a saved transaction counts for both calendar days.
 */
function daysOfTransaction(value: string | Date): number[] {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return []

  const utc = dayFromParts(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  )
  const local = dayFromParts(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  )
  return utc === local
    ? [
        utc
      ]
    : [
        utc,
        local
      ]
}

function toCents(amount: number): number {
  return Math.round(Math.abs(amount) * 100)
}

/** Whether a saved transaction took money out of or put money into an account. */
function directionForAccount(
  transaction: HistoryTransaction,
  accountId: string
): Direction | null {
  if (transaction.type === TransactionType.TRANSFER) {
    if (transaction.account.id === accountId) return 'out'
    if (transaction.transferToAccount?.id === accountId) return 'in'
    return null
  }
  if (transaction.account.id !== accountId) return null
  return transaction.type === TransactionType.EXPENSE ? 'out' : 'in'
}

function candidateKey(direction: Direction, cents: number): string {
  return `${direction}:${cents}`
}

function candidatesForAccount(
  history: HistoryTransaction[],
  accountId: string
): Map<string, Candidate[]> {
  const byKey = new Map<string, Candidate[]>()
  const seen = new Set<string>()

  for (const transaction of history) {
    if (seen.has(transaction.id)) continue
    seen.add(transaction.id)

    const direction = directionForAccount(transaction, accountId)
    if (!direction) continue

    const key = candidateKey(direction, toCents(transaction.amount))
    const list = byKey.get(key) ?? []
    list.push({
      transaction,
      days: daysOfTransaction(transaction.date),
      linkedToInstance: Boolean(
        transaction.billInstance || transaction.incomeInstance
      ),
      used: false
    })
    byKey.set(key, list)
  }

  return byKey
}

/**
 * Marks statement rows that already exist as saved transactions on the same
 * account and excludes them, so the same period can be imported again without
 * creating duplicates.
 *
 * A row matches a saved transaction with the same amount and direction on the
 * row's booking date, then its purchase date, then (for transactions linked to
 * a bill or income instance) within a week. Each saved transaction covers one
 * row, so two identical purchases on one day need two saved transactions.
 */
export function markAlreadyImported(
  drafts: TransactionDraft[],
  history: HistoryTransaction[]
): TransactionDraft[] {
  const next = drafts.map((draft) =>
    draft.duplicateOfTransactionId
      ? {
          ...draft,
          excluded: false,
          duplicateOfTransactionId: undefined
        }
      : draft
  )
  if (history.length === 0) return next

  const candidatesByAccount = new Map<string, Map<string, Candidate[]>>()
  const candidatesFor = (draft: TransactionDraft): Candidate[] => {
    if (!draft.originAccountId || draft.signedAmount === 0) return []
    let byKey = candidatesByAccount.get(draft.originAccountId)
    if (!byKey) {
      byKey = candidatesForAccount(history, draft.originAccountId)
      candidatesByAccount.set(draft.originAccountId, byKey)
    }
    return (
      byKey.get(
        candidateKey(
          draft.signedAmount < 0 ? 'out' : 'in',
          toCents(draft.signedAmount)
        )
      ) ?? []
    )
  }

  const matchers: Array<
    (draft: TransactionDraft, candidate: Candidate) => boolean
  > = [
    (draft, candidate) => {
      const day = dayFromIsoDate(draft.date)
      return day !== null && candidate.days.includes(day)
    },
    (draft, candidate) => {
      const day = dayFromIsoDate(
        cleanBankDescription(draft.originalDescription).purchaseDate
      )
      return day !== null && candidate.days.includes(day)
    },
    (draft, candidate) => {
      const day = dayFromIsoDate(draft.date)
      return (
        day !== null &&
        candidate.linkedToInstance &&
        candidate.days.some(
          (candidateDay) =>
            Math.abs(candidateDay - day) <= INSTANCE_DATE_WINDOW_DAYS
        )
      )
    }
  ]

  // Every row gets a chance at an exact date match before looser matchers run.
  for (const matches of matchers) {
    for (let index = 0; index < next.length; index++) {
      const draft = next[index]
      if (draft.duplicateOfTransactionId) continue

      const candidate = candidatesFor(draft).find(
        (item) => !item.used && matches(draft, item)
      )
      if (!candidate) continue

      candidate.used = true
      next[index] = {
        ...draft,
        excluded: true,
        duplicateOfTransactionId: candidate.transaction.id
      }
    }
  }

  return next
}

export type LatestAccountTransaction = {
  date: Date
  name: string
  amount: number
}

/**
 * The most recent saved transaction on an account that is not dated in the
 * future — shows how far the account has been kept up to date.
 */
export function findLatestAccountTransaction(
  history: HistoryTransaction[],
  accountId: string,
  now: Date = new Date()
): LatestAccountTransaction | null {
  if (!accountId) return null

  let latest: {
    transaction: HistoryTransaction
    time: number
    createdAt: number
  } | null = null

  for (const transaction of history) {
    if (!directionForAccount(transaction, accountId)) continue

    const date =
      transaction.date instanceof Date
        ? transaction.date
        : new Date(transaction.date)
    const time = date.getTime()
    if (Number.isNaN(time) || time > now.getTime()) continue

    const createdAt = new Date(transaction.createdAt).getTime() || 0
    if (
      !latest ||
      time > latest.time ||
      (time === latest.time && createdAt > latest.createdAt)
    ) {
      latest = {
        transaction,
        time,
        createdAt
      }
    }
  }

  if (!latest) return null
  return {
    date: new Date(latest.time),
    name: latest.transaction.name,
    amount: latest.transaction.amount
  }
}
