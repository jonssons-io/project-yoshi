import { RecurrenceType } from '@/api/generated/types.gen'
import type { ComboboxValue } from '@/components/form'

export type BillSplitRowValue = {
  id: string
  subtitle: string
  amount: number | null
  category: ComboboxValue | null
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
