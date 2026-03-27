import { RecurrenceType } from '@/api/generated/types.gen'

import type { CreateIncomeFormValues } from './schema'

/**
 * Maps validated income form values to the create-income mutation payload.
 */
export function mapIncomeFormToCreateVariables(
  data: CreateIncomeFormValues,
  householdId: string,
  userId?: string | null
) {
  const incomeSourcePart =
    data.incomeSource === null || data.incomeSource === undefined
      ? {}
      : typeof data.incomeSource === 'object' &&
          'isNew' in data.incomeSource &&
          data.incomeSource.isNew
        ? {
            newIncomeSourceName: data.incomeSource.name
          }
        : {
            incomeSourceId: data.incomeSource as string
          }

  const categoryPart =
    typeof data.category === 'object' && data.category?.isNew
      ? {
          newCategoryName: data.category.name
        }
      : {
          categoryId: data.category as string
        }

  return {
    householdId,
    userId,
    name: data.name,
    ...incomeSourcePart,
    amount: data.amount,
    expectedDate: data.expectedDate,
    accountId: data.accountId,
    ...categoryPart,
    recurrenceType: data.recurrenceType,
    customIntervalDays:
      data.recurrenceType === RecurrenceType.CUSTOM
        ? (data.customIntervalDays ?? null)
        : null,
    endDate: data.endDate ?? undefined
  }
}
