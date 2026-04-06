import { CategoryType, RecurrenceType } from '@/api/generated/types.gen'
import type { ComboboxValue } from '@/components/form'

/** Form state before validation (e.g. optional income source until selected). */
export type CreateIncomeDrawerFormState = {
  name: string
  incomeSource: ComboboxValue | null
  amount: number | null
  expectedDate: Date
  accountId: string
  category: ComboboxValue
  recurrenceType: RecurrenceType
  customIntervalDays?: number | null
  endDate?: Date | null
}

export const CREATE_INCOME_DEFAULT_VALUES: CreateIncomeDrawerFormState = {
  name: '',
  incomeSource: null,
  amount: null,
  expectedDate: new Date(),
  accountId: '',
  category: '',
  recurrenceType: RecurrenceType.MONTHLY,
  customIntervalDays: undefined,
  endDate: undefined
}

export function filterIncomeCategories<
  T extends {
    types: Array<CategoryType>
  }
>(categories: T[]): T[] {
  return categories.filter((c) => c.types.includes(CategoryType.INCOME))
}
