import type { TFunction } from 'i18next'

import {
  CategoryType,
  TransactionType,
  type UpdateTransactionRequest
} from '@/api/generated/types.gen'
import type { ComboboxValue } from '@/components/form'

import {
  categoryToApi,
  splitCategoryToApi
} from '../create-transaction-drawer/map-to-request'
import type { ParsedDrawerFormValues } from '../create-transaction-drawer/schema'

function incomeSourceToUpdateApi(
  s: ComboboxValue | null | undefined
): Pick<UpdateTransactionRequest, 'incomeSourceId'> {
  if (!s) return {}
  if (typeof s === 'string')
    return {
      incomeSourceId: s
    }
  if (typeof s === 'object' && s !== null && 'isNew' in s && s.isNew) {
    throw new Error('transactions.editInlineSenderNotSupported')
  }
  return {}
}

function recipientToUpdateApi(
  r: ComboboxValue | null | undefined
): Pick<UpdateTransactionRequest, 'recipientId'> {
  if (!r)
    return {
      recipientId: null
    }
  if (typeof r === 'string')
    return {
      recipientId: r
    }
  if (typeof r === 'object' && r !== null && 'isNew' in r && r.isNew) {
    throw new Error('transactions.editInlineRecipientNotSupported')
  }
  return {
    recipientId: null
  }
}

/**
 * Maps validated create-transaction drawer values to a PATCH body for {@link updateTransaction}.
 */
export function buildUpdateTransactionBody(params: {
  t: TFunction
  data: ParsedDrawerFormValues
  hasSplits: boolean
  instanceId: string | null
}): UpdateTransactionRequest {
  const { t, data, hasSplits, instanceId } = params
  const transferLabel = t('common.transfer')

  if (data.transactionType === TransactionType.TRANSFER) {
    if (data.amount == null) {
      throw new Error('buildUpdateTransactionBody: transfer amount is required')
    }
    return {
      type: TransactionType.TRANSFER,
      accountId: data.accountId,
      transferToAccountId: data.transferToAccountId,
      name: transferLabel,
      amount: data.amount,
      budgetId: null,
      categoryId: null,
      recipientId: null,
      incomeSourceId: null,
      instanceId: null,
      splits: []
    }
  }

  if (
    data.transactionType === TransactionType.EXPENSE &&
    hasSplits &&
    data.splits &&
    data.splits.length > 0
  ) {
    const splitRows = data.splits
    const splitsTotal = splitRows.reduce((s, r) => {
      if (r.amount == null) {
        throw new Error('buildUpdateTransactionBody: split amount is required')
      }
      return s + r.amount
    }, 0)
    return {
      type: TransactionType.EXPENSE,
      accountId: data.accountId,
      name: data.name,
      amount: splitsTotal,
      budgetId: null,
      categoryId: null,
      instanceId,
      splits: splitRows.map((row) => {
        if (row.amount == null) {
          throw new Error(
            'buildUpdateTransactionBody: split amount is required'
          )
        }
        return {
          subtitle:
            row.subtitle.trim().length > 0
              ? row.subtitle.trim()
              : t('forms.namelessSection'),
          amount: row.amount,
          budgetId: row.budgetId,
          ...splitCategoryToApi(row.category)
        }
      }),
      ...recipientToUpdateApi(data.recipient)
    }
  }

  if (data.transactionType === TransactionType.EXPENSE) {
    if (data.amount == null) {
      throw new Error('buildUpdateTransactionBody: expense amount is required')
    }
    const cat = categoryToApi(data.category, CategoryType.EXPENSE)
    if ('newCategory' in cat && cat.newCategory) {
      throw new Error('transactions.editInlineCategoryNotSupported')
    }
    return {
      type: TransactionType.EXPENSE,
      accountId: data.accountId,
      name: data.name,
      amount: data.amount,
      budgetId: data.budgetId || null,
      categoryId: 'categoryId' in cat ? (cat.categoryId ?? null) : null,
      instanceId,
      splits: [],
      ...recipientToUpdateApi(data.recipient)
    }
  }

  if (data.amount == null) {
    throw new Error('buildUpdateTransactionBody: income amount is required')
  }
  const cat = categoryToApi(data.category, CategoryType.INCOME)
  if ('newCategory' in cat && cat.newCategory) {
    throw new Error('transactions.editInlineCategoryNotSupported')
  }
  return {
    type: TransactionType.INCOME,
    accountId: data.accountId,
    name: data.name,
    amount: data.amount,
    budgetId: null,
    categoryId: 'categoryId' in cat ? (cat.categoryId ?? null) : null,
    instanceId,
    transferToAccountId: null,
    recipientId: null,
    splits: [],
    ...incomeSourceToUpdateApi(data.sender)
  }
}
