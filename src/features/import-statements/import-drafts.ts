import { TransactionType } from '@/api/generated/types.gen'
import { findMatchingAccountId, guessTransferAccountId } from './accounts'
import { markAlreadyImported } from './already-imported'
import { applyAssignmentRules } from './classification/assignment-rules'
import {
  buildImportHistoryIndex,
  findTransferCounterpartId,
  type HistoryTransaction,
  type ImportHistoryIndex
} from './classification/history-matching'
import { pairTransfersAcrossStatements } from './transfer-pairing'
import type {
  ImportLookupItem,
  ImportStatement,
  StatementParseResult,
  TransactionDraft
} from './types'

export type ImportDraftLookups = {
  accounts: ImportLookupItem[]
  recipients: ImportLookupItem[]
  incomeSources: ImportLookupItem[]
  categories: ImportLookupItem[]
  budgets?: ImportLookupItem[]
}

/** How far back saved transactions are read to learn from and compare with. */
const HISTORY_LOOKBACK_DAYS = 365

/**
 * Start of the period of saved transactions the import needs: a year before
 * the oldest statement row. Undefined when there is nothing to import.
 */
export function importHistoryStartDate(
  statements: ImportStatement[]
): Date | undefined {
  let earliest: string | undefined
  for (const statement of statements) {
    for (const draft of statement.result.transactions) {
      if (!earliest || draft.date < earliest) earliest = draft.date
    }
  }
  if (!earliest) return undefined

  const start = new Date(`${earliest}T00:00:00.000Z`)
  if (Number.isNaN(start.getTime())) return undefined
  start.setUTCDate(start.getUTCDate() - HISTORY_LOOKBACK_DAYS)
  return start
}

export function applyTransferAccountDefaults(
  draft: Pick<TransactionDraft, 'originalDescription' | 'signedAmount'>,
  accounts: ImportLookupItem[],
  originAccountId: string,
  historyIndex?: ImportHistoryIndex
): Pick<TransactionDraft, 'transferFromAccountId' | 'transferToAccountId'> {
  const isTransferIn = draft.signedAmount > 0
  // An account number in the bank text is the strongest hint; otherwise use
  // the account the same text was moved to or from last time.
  const counterpartAccountId =
    guessTransferAccountId(
      draft.originalDescription,
      accounts,
      originAccountId
    ) ||
    (historyIndex
      ? findTransferCounterpartId(
          draft,
          historyIndex,
          accounts,
          originAccountId
        )
      : '')

  return {
    transferFromAccountId: isTransferIn
      ? counterpartAccountId
      : originAccountId,
    transferToAccountId: isTransferIn ? originAccountId : counterpartAccountId
  }
}

export function toLookupItems(
  items: Array<{
    id: string
    name: string
    archived?: boolean
    externalIdentifier?: string | null
  }>
): ImportLookupItem[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    archived: item.archived,
    externalIdentifier: item.externalIdentifier
  }))
}

export function buildDraftsFromStatement(
  result: StatementParseResult,
  lookups: ImportDraftLookups,
  options: {
    statementIndex?: number
    /** Account chosen by the user; skips matching on the account number. */
    originAccountId?: string
    historyIndex?: ImportHistoryIndex
  } = {}
): {
  originAccountId: string
  drafts: TransactionDraft[]
} {
  const originAccountId =
    options.originAccountId ??
    findMatchingAccountId(result.accountNumber, lookups.accounts)
  const drafts = result.transactions.map((draft) => {
    const assigned = applyAssignmentRules(
      {
        ...draft,
        statementIndex: options.statementIndex,
        originAccountId
      },
      {
        recipients: lookups.recipients,
        incomeSources: lookups.incomeSources,
        categories: lookups.categories,
        budgets: lookups.budgets,
        history: options.historyIndex
      }
    )

    if (assigned.type !== TransactionType.TRANSFER) return assigned

    return {
      ...assigned,
      ...applyTransferAccountDefaults(
        assigned,
        lookups.accounts,
        originAccountId,
        options.historyIndex
      )
    }
  })

  return {
    originAccountId,
    drafts
  }
}

/**
 * Turns every uploaded statement into drafts, then looks across all of them:
 * rows that are already saved are excluded, and money moving between two of
 * the uploaded accounts is paired into a single transfer.
 */
export function buildDraftsFromStatements(
  statements: ImportStatement[],
  lookups: ImportDraftLookups & {
    history?: HistoryTransaction[]
  },
  /** Accounts chosen by the user, by position in `statements`. */
  originAccountOverrides: Array<string | undefined> = []
): {
  originAccountIds: string[]
  drafts: TransactionDraft[]
} {
  const history = lookups.history ?? []
  const historyIndex = buildImportHistoryIndex(history)
  const originAccountIds: string[] = []
  const drafts: TransactionDraft[] = []

  statements.forEach((statement, statementIndex) => {
    const built = buildDraftsFromStatement(statement.result, lookups, {
      statementIndex,
      originAccountId: originAccountOverrides[statementIndex],
      historyIndex
    })
    originAccountIds.push(built.originAccountId)
    drafts.push(...built.drafts)
  })

  return {
    originAccountIds,
    drafts: pairTransfersAcrossStatements(markAlreadyImported(drafts, history))
  }
}

/**
 * Moves one statement to another account without touching anything else the
 * user has edited: only the account fields of its rows, and the matching side
 * of transfers paired with them, change.
 */
export function changeOriginAccountInPlace(
  drafts: TransactionDraft[],
  statementIndex: number,
  accountId: string
): TransactionDraft[] {
  const movedIds = new Set(
    drafts
      .filter((draft) => (draft.statementIndex ?? 0) === statementIndex)
      .map((draft) => draft.id)
  )

  return drafts.map((draft) => {
    const isTransfer = draft.type === TransactionType.TRANSFER

    if (movedIds.has(draft.id)) {
      return {
        ...draft,
        originAccountId: accountId,
        transferFromAccountId:
          isTransfer && draft.signedAmount < 0
            ? accountId
            : draft.transferFromAccountId,
        transferToAccountId:
          isTransfer && draft.signedAmount > 0
            ? accountId
            : draft.transferToAccountId
      }
    }

    if (
      isTransfer &&
      draft.pairedWithDraftId &&
      movedIds.has(draft.pairedWithDraftId)
    ) {
      // The moved statement is the other side of this transfer.
      return {
        ...draft,
        transferFromAccountId:
          draft.signedAmount > 0 ? accountId : draft.transferFromAccountId,
        transferToAccountId:
          draft.signedAmount < 0 ? accountId : draft.transferToAccountId
      }
    }

    return draft
  })
}
