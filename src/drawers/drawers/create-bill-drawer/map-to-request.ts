import type { TFunction } from 'i18next'

import {
  type BillPaymentHandling,
  type CreateBillRequest,
  RecurrenceType
} from '@/api/generated/types.gen'

import {
  recipientToApi,
  splitCategoryToApi
} from '../create-transaction-drawer/map-to-request'
import type { ParsedCreateBillDrawerValues } from './schema'

/** {@link CreateBillRequest} uses `recipientId?: string`, not `null`. */
function billRecipientFields(
  recipient: ParsedCreateBillDrawerValues['recipient']
): Pick<CreateBillRequest, 'recipientId' | 'newRecipientName'> {
  const r = recipientToApi(recipient ?? null)
  if (r.newRecipientName) {
    return {
      newRecipientName: r.newRecipientName
    }
  }
  if (r.recipientId != null && r.recipientId !== '') {
    return {
      recipientId: r.recipientId
    }
  }
  return {}
}

function categoryToBillTopLevel(
  c: ParsedCreateBillDrawerValues['category']
): Pick<CreateBillRequest, 'categoryId' | 'newCategoryName'> {
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

type BuildBodyParams = {
  t: TFunction
  data: ParsedCreateBillDrawerValues
  hasSplits: boolean
}

/**
 * Maps validated drawer values to {@link CreateBillRequest} (dates still as `Date`; mutation normalizes to API strings).
 */
export function buildCreateBillBody(params: BuildBodyParams): Omit<
  CreateBillRequest,
  'dueDate' | 'endDate' | 'lastPaymentDate'
> & {
  dueDate: Date
  endDate: Date | null | undefined
} {
  const { t, data, hasSplits } = params
  const recurrenceExtras =
    data.recurrenceType === RecurrenceType.CUSTOM && data.customIntervalDays
      ? {
          recurrenceType: data.recurrenceType,
          customIntervalDays: data.customIntervalDays
        }
      : {
          recurrenceType: data.recurrenceType
        }

  const rawHandling = data.paymentHandling as string | undefined
  const paymentHandling: BillPaymentHandling | undefined = rawHandling
    ? (rawHandling as BillPaymentHandling)
    : undefined

  const base = {
    name: data.name,
    ...billRecipientFields(data.recipient),
    accountId: data.accountId,
    dueDate: data.dueDate,
    endDate: data.endDate ?? null,
    paymentHandling,
    ...recurrenceExtras
  }

  if (hasSplits && data.splits && data.splits.length > 0) {
    const estimatedAmount = data.splits.reduce((s, r) => {
      if (r.amount == null) {
        throw new Error('buildCreateBillBody: split amount is required')
      }
      return s + r.amount
    }, 0)
    return {
      ...base,
      budgetId: null,
      estimatedAmount,
      splits: data.splits.map((row) => {
        if (row.amount == null) {
          throw new Error('buildCreateBillBody: split amount is required')
        }
        return {
          subtitle:
            row.subtitle.trim().length > 0
              ? row.subtitle.trim()
              : t('forms.namelessSection'),
          amount: row.amount,
          ...splitCategoryToApi(row.category)
        }
      })
    }
  }

  if (data.amount == null) {
    throw new Error('buildCreateBillBody: amount is required')
  }
  return {
    ...base,
    budgetId: data.budgetId ? data.budgetId : null,
    estimatedAmount: data.amount,
    ...categoryToBillTopLevel(data.category)
  }
}
