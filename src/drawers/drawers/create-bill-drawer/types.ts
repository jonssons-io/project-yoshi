import { RecurrenceType } from '@/api/generated/types.gen'
import type { ComboboxValue } from '@/components/form'

export type BillSplitRowValue = {
  id: string
  subtitle: string
  amount: number | null
  budgetId: string
  category: ComboboxValue | null
  /**
   * When hydrating from the API, label for the category combobox until budget-scoped options load
   * (or when the id is not in the current option list). Not sent to the API.
   */
  prefillCategoryName?: string
}

export type CreateBillDrawerFormValues = {
  name: string
  recipient: ComboboxValue | null
  accountId: string
  recurrenceType: RecurrenceType
  customIntervalDays?: number | null
  paymentHandling: string
  dueDate: Date
  endDate: Date | null
  amount: number | null
  budgetId: string
  category: ComboboxValue | null
  splits: BillSplitRowValue[]
}

export function newBillSplitRow(): BillSplitRowValue {
  return {
    id: crypto.randomUUID(),
    subtitle: '',
    amount: null,
    budgetId: '',
    category: null
  }
}

export const CREATE_BILL_DRAWER_DEFAULTS: CreateBillDrawerFormValues = {
  name: '',
  recipient: null,
  accountId: '',
  recurrenceType: RecurrenceType.MONTHLY,
  customIntervalDays: undefined,
  paymentHandling: '',
  dueDate: new Date(),
  endDate: null,
  amount: null,
  budgetId: '',
  category: null,
  splits: []
}
