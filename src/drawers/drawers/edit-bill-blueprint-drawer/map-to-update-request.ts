import type { TFunction } from 'i18next'

import { buildCreateBillBody } from '../create-bill-drawer/map-to-request'
import type { ParsedCreateBillDrawerValues } from '../create-bill-drawer/schema'

export type BlueprintUpdateMode = 'upcoming' | 'all'

type Params = {
  t: TFunction
  data: ParsedCreateBillDrawerValues
  mode: BlueprintUpdateMode
  /** When `mode === 'upcoming'`: instant from which template changes apply (API `startDate`). */
  scopeChangeDate: Date | undefined
  /** Debit / last payment instant when `mode === 'upcoming'` (API `lastPaymentDate`). */
  debitInstant: Date | undefined
  /** Preserved `lastPaymentDate` when `mode === 'all'`. */
  previousLastPaymentDate: Date | undefined
  /** Whether the template had real split lines when the drawer was opened (used to clear splits on save). */
  templateHadSplitsAtOpen: boolean
}

/**
 * Maps validated create-bill-shaped form values to {@link useUpdateBill} variables
 * (dates as `Date`; mutation normalizes to ISO strings).
 */
export function buildUpdateBillVariablesFromBlueprintForm(params: Params) {
  const {
    t,
    data,
    mode,
    scopeChangeDate,
    debitInstant,
    previousLastPaymentDate,
    templateHadSplitsAtOpen
  } = params

  const hasSplits = (data.splits?.length ?? 0) > 0

  const raw = buildCreateBillBody({
    t,
    data,
    hasSplits
  })

  const startDate =
    mode === 'upcoming' ? (scopeChangeDate ?? data.startDate) : data.startDate

  const lastPaymentDate =
    mode === 'upcoming'
      ? (debitInstant ?? data.startDate)
      : (previousLastPaymentDate ?? debitInstant ?? data.startDate)

  return {
    name: raw.name,
    accountId: raw.accountId,
    startDate,
    endDate: raw.endDate ?? null,
    lastPaymentDate,
    recurrenceType: raw.recurrenceType,
    customIntervalDays: raw.customIntervalDays,
    paymentHandling: raw.paymentHandling,
    budgetId: raw.budgetId ?? null,
    estimatedAmount: raw.estimatedAmount,
    ...('recipientId' in raw && raw.recipientId
      ? {
          recipientId: raw.recipientId
        }
      : {}),
    ...('newRecipientName' in raw && raw.newRecipientName
      ? {
          newRecipientName: raw.newRecipientName
        }
      : {}),
    ...('categoryId' in raw && raw.categoryId
      ? {
          categoryId: raw.categoryId
        }
      : {}),
    ...('newCategoryName' in raw && raw.newCategoryName
      ? {
          newCategoryName: raw.newCategoryName
        }
      : {}),
    ...(hasSplits && raw.splits && raw.splits.length > 0
      ? {
          categoryId: null,
          splits: raw.splits
        }
      : templateHadSplitsAtOpen
        ? {
            splits: []
          }
        : {})
  }
}
