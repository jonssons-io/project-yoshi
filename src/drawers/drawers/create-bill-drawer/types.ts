import { RecurrenceType } from '@/api/generated/types.gen'
import type { ComboboxValue } from '@/components/form'

export type BillSplitRowValue = {
  id: string
  subtitle: string
  amount: number
  category: ComboboxValue | null
}

export type CreateBillDrawerFormValues = {
  name: string
  recipient: ComboboxValue | null
  accountId: string
  recurrenceType: RecurrenceType
  customIntervalDays?: number
  paymentHandling: string
  startDate: Date
  endDate: Date | null
  amount: number
  budgetId: string
  category: ComboboxValue | null
  splits: BillSplitRowValue[]
}

export function newBillSplitRow(): BillSplitRowValue {
  return {
    id: crypto.randomUUID(),
    subtitle: '',
    amount: 0,
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
  startDate: new Date(),
  endDate: null,
  amount: 0,
  budgetId: '',
  category: null,
  splits: []
}
