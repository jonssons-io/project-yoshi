import { TransactionType } from '@/api/generated/types.gen'
import type { ComboboxValue } from '@/components/form'

export type SplitRowValue = {
  id: string
  subtitle: string
  amount: number
  budgetId: string
  category: ComboboxValue | null
}

export type DrawerFormValues = {
  name: string
  date: Date
  amount: number
  transactionType: TransactionType
  accountId: string
  transferToAccountId: string
  recipient: ComboboxValue | null
  budgetId: string
  category: ComboboxValue | null
  splits: SplitRowValue[]
}

export function newSplitRow(): SplitRowValue {
  return {
    id: crypto.randomUUID(),
    subtitle: '',
    amount: 0,
    budgetId: '',
    category: null
  }
}

export const DRAWER_DEFAULT_VALUES: DrawerFormValues = {
  name: '',
  date: new Date(),
  amount: 0,
  transactionType: TransactionType.EXPENSE,
  accountId: '',
  transferToAccountId: '',
  recipient: null,
  budgetId: '',
  category: null,
  splits: []
}
