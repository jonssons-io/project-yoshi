import {
  type BulkAllocationAdjustment,
  type BulkCreateTransactionItem,
  type BulkCreateTransactionsRequest,
  CategoryType,
  TransactionType
} from '@/api/generated/types.gen'
import {
  categoryToApi,
  incomeSourceToApi,
  recipientToApi
} from '@/drawers/drawers/create-transaction-drawer/map-to-request'
import { toApiDateRequired } from '@/hooks/api/date-normalization'
import { idOrNewNameToComboboxValue } from './components/import-table-fields'
import type { TransactionDraft } from './types'

function optionalInstanceId(id: string | null | undefined): string | null {
  const trimmed = id?.trim()
  return trimmed ? trimmed : null
}

function draftToBulkCreateItem(
  draft: TransactionDraft
): BulkCreateTransactionItem {
  const base = {
    clientRowId: draft.id,
    name: draft.name,
    amount: draft.amount,
    date: toApiDateRequired(draft.date)
  }

  if (draft.type === TransactionType.EXPENSE) {
    return {
      ...base,
      type: TransactionType.EXPENSE,
      accountId: draft.originAccountId,
      budgetId: draft.budgetId ?? null,
      instanceId: optionalInstanceId(draft.billInstanceId),
      ...categoryToApi(
        idOrNewNameToComboboxValue(draft.categoryId, draft.newCategoryName),
        CategoryType.EXPENSE
      ),
      ...recipientToApi(
        idOrNewNameToComboboxValue(draft.recipientId, draft.newRecipientName)
      )
    }
  }

  if (draft.type === TransactionType.INCOME) {
    return {
      ...base,
      type: TransactionType.INCOME,
      accountId: draft.originAccountId,
      budgetId: null,
      instanceId: optionalInstanceId(draft.incomeInstanceId),
      ...categoryToApi(
        idOrNewNameToComboboxValue(draft.categoryId, draft.newCategoryName),
        CategoryType.INCOME
      ),
      ...incomeSourceToApi(
        idOrNewNameToComboboxValue(
          draft.incomeSourceId,
          draft.newIncomeSourceName
        )
      )
    }
  }

  if (draft.type === TransactionType.TRANSFER) {
    return {
      ...base,
      type: TransactionType.TRANSFER,
      accountId: draft.transferFromAccountId ?? draft.originAccountId,
      transferToAccountId: draft.transferToAccountId ?? null,
      categoryId: null,
      budgetId: null,
      recipientId: null
    }
  }

  throw new Error(
    `buildBulkCreateRequest: unsupported draft type "${draft.type}"`
  )
}

function isIncludedDraft(draft: TransactionDraft): boolean {
  return !draft.excluded && draft.type !== 'uncategorized'
}

/**
 * Maps reviewed import drafts to the bulk create API request body.
 */
export function buildBulkCreateRequest(
  drafts: TransactionDraft[],
  options?: {
    types?: TransactionType[]
    allocationAdjustments?: BulkAllocationAdjustment[]
  }
): BulkCreateTransactionsRequest {
  const types = options?.types
  const request: BulkCreateTransactionsRequest = {
    transactions: drafts
      .filter(isIncludedDraft)
      .filter(
        (draft) => !types || types.includes(draft.type as TransactionType)
      )
      .map(draftToBulkCreateItem)
  }

  if (
    options?.allocationAdjustments &&
    options.allocationAdjustments.length > 0
  ) {
    request.allocationAdjustments = options.allocationAdjustments
  }

  return request
}
