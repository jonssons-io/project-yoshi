import { TransactionType } from '@/api/generated/types.gen'
import { findMatchingAccountId, guessTransferAccountId } from './accounts'
import { applyAssignmentRules } from './classification/assignment-rules'
import type {
  ImportLookupItem,
  StatementParseResult,
  TransactionDraft
} from './types'

export function applyTransferAccountDefaults(
  draft: Pick<
    TransactionDraft,
    'originalDescription' | 'signedAmount'
  >,
  accounts: ImportLookupItem[],
  originAccountId: string
): Pick<TransactionDraft, 'transferFromAccountId' | 'transferToAccountId'> {
  const isTransferIn = draft.signedAmount > 0

  return {
    transferFromAccountId: isTransferIn
      ? guessTransferAccountId(
          draft.originalDescription,
          accounts,
          originAccountId
        )
      : originAccountId,
    transferToAccountId: isTransferIn
      ? originAccountId
      : guessTransferAccountId(
          draft.originalDescription,
          accounts,
          originAccountId
        )
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
  lookups: {
    accounts: ImportLookupItem[]
    recipients: ImportLookupItem[]
    incomeSources: ImportLookupItem[]
    categories: ImportLookupItem[]
  }
): {
  originAccountId: string
  drafts: TransactionDraft[]
} {
  const originAccountId = findMatchingAccountId(
    result.accountNumber,
    lookups.accounts
  )
  const drafts = result.transactions.map((draft) => {
    const assigned = applyAssignmentRules(
      {
        ...draft,
        originAccountId
      },
      {
        recipients: lookups.recipients,
        incomeSources: lookups.incomeSources,
        categories: lookups.categories
      }
    )

    if (assigned.type !== TransactionType.TRANSFER) return assigned

    return {
      ...assigned,
      ...applyTransferAccountDefaults(
        assigned,
        lookups.accounts,
        originAccountId
      )
    }
  })

  return {
    originAccountId,
    drafts
  }
}
