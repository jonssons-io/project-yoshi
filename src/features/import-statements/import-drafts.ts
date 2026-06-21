import { TransactionType } from '@/api/generated/types.gen'
import { findMatchingAccountId, guessTransferAccountId } from './accounts'
import { applyAssignmentRules } from './classification/assignment-rules'
import type {
  ImportLookupItem,
  StatementParseResult,
  TransactionDraft
} from './types'

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
      transferFromAccountId:
        assigned.amount > 0
          ? guessTransferAccountId(
              assigned.originalDescription,
              lookups.accounts,
              originAccountId
            )
          : originAccountId,
      transferToAccountId:
        assigned.amount > 0
          ? originAccountId
          : guessTransferAccountId(
              assigned.originalDescription,
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
