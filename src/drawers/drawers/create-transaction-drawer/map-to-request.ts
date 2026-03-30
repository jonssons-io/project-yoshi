import type { TFunction } from 'i18next'
import {
  CategoryType,
  type CreateTransactionRequest,
  TransactionType
} from '@/api/generated/types.gen'
import type { ComboboxValue } from '@/components/form'

import type { ParsedDrawerFormValues } from './schema'

type CreateTransactionSplitItem = NonNullable<
  CreateTransactionRequest['splits']
>[number]

/**
 * Maps a split-row category combobox value to the create-transaction split payload.
 * API: either `categoryId` or `newCategoryName` (inline category is EXPENSE/INCOME from parent transaction type).
 */
export function splitCategoryToApi(
  c: ComboboxValue | null | undefined
): Pick<CreateTransactionSplitItem, 'categoryId' | 'newCategoryName'> {
  if (!c) return {}
  if (typeof c === 'string')
    return {
      categoryId: c
    }
  if (typeof c === 'object' && c !== null && 'isNew' in c && c.isNew) {
    return {
      newCategoryName: c.name
    }
  }
  return {}
}

export function categoryToApi(
  c: ComboboxValue | null | undefined,
  categoryType: CategoryType
): Pick<CreateTransactionRequest, 'categoryId' | 'newCategory'> {
  if (!c) return {}
  if (typeof c === 'string')
    return {
      categoryId: c
    }
  if (typeof c === 'object' && c !== null && 'isNew' in c && c.isNew) {
    return {
      newCategory: {
        name: c.name,
        type: categoryType
      }
    }
  }
  return {}
}

export function recipientToApi(
  r: ComboboxValue | null | undefined
): Pick<CreateTransactionRequest, 'recipientId' | 'newRecipientName'> {
  if (!r)
    return {
      recipientId: null
    }
  if (typeof r === 'string')
    return {
      recipientId: r
    }
  if (typeof r === 'object' && r !== null && 'isNew' in r && r.isNew) {
    return {
      newRecipientName: r.name,
      recipientId: null
    }
  }
  return {
    recipientId: null
  }
}

/**
 * Maps a sender combobox value to `incomeSourceId` / `newIncomeSourceName`.
 */
function incomeSourceToApi(
  s: ComboboxValue | null | undefined
): Pick<CreateTransactionRequest, 'incomeSourceId' | 'newIncomeSourceName'> {
  if (!s) return {}
  if (typeof s === 'string')
    return {
      incomeSourceId: s
    }
  if (typeof s === 'object' && s !== null && 'isNew' in s && s.isNew) {
    return {
      newIncomeSourceName: s.name
    }
  }
  return {}
}

export type CreateTransactionBody = Omit<CreateTransactionRequest, 'date'> & {
  date: Date
}

export function buildCreateTransactionBody(params: {
  t: TFunction
  data: ParsedDrawerFormValues
  hasSplits: boolean
  instanceId?: string
}): CreateTransactionBody {
  const { t, data, hasSplits, instanceId } = params
  const transferName = t('common.transfer')

  if (data.transactionType === TransactionType.TRANSFER) {
    return {
      type: TransactionType.TRANSFER,
      accountId: data.accountId,
      transferToAccountId: data.transferToAccountId,
      name: transferName,
      amount: data.amount,
      date: data.date,
      categoryId: null,
      budgetId: null,
      recipientId: null
    }
  }

  if (
    data.transactionType === TransactionType.EXPENSE &&
    hasSplits &&
    data.splits &&
    data.splits.length > 0
  ) {
    const splitRows = data.splits
    const splitsTotal = splitRows.reduce((s, r) => s + r.amount, 0)
    return {
      type: TransactionType.EXPENSE,
      accountId: data.accountId,
      name: data.name,
      amount: splitsTotal,
      date: data.date,
      budgetId: null,
      categoryId: null,
      splits: splitRows.map((row) => ({
        subtitle:
          row.subtitle.trim().length > 0
            ? row.subtitle.trim()
            : t('forms.namelessSection'),
        amount: row.amount,
        budgetId: row.budgetId,
        ...splitCategoryToApi(row.category)
      })),
      ...recipientToApi(data.recipient)
    }
  }

  if (data.transactionType === TransactionType.EXPENSE) {
    return {
      type: TransactionType.EXPENSE,
      accountId: data.accountId,
      name: data.name,
      amount: data.amount,
      date: data.date,
      budgetId: data.budgetId || null,
      instanceId: instanceId ?? null,
      ...categoryToApi(data.category, CategoryType.EXPENSE),
      ...recipientToApi(data.recipient)
    }
  }

  return {
    type: TransactionType.INCOME,
    accountId: data.accountId,
    name: data.name,
    amount: data.amount,
    date: data.date,
    budgetId: null,
    instanceId: instanceId ?? null,
    ...categoryToApi(data.category, CategoryType.INCOME),
    ...incomeSourceToApi(data.sender)
  }
}
