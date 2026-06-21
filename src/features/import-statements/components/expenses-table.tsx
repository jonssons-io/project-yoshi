import {
  type BillInstance,
  type IncomeInstance,
  TransactionType
} from '@/api/generated/types.gen'
import type { ImportLookupItem, TransactionDraft } from '../types'
import { ImportDraftTable } from './import-draft-table'

type Props = {
  title: string
  rows: TransactionDraft[]
  accounts: ImportLookupItem[]
  budgets: ImportLookupItem[]
  categories: ImportLookupItem[]
  recipients: ImportLookupItem[]
  incomeSources: ImportLookupItem[]
  incomeInstances: IncomeInstance[]
  billInstances: Array<
    Omit<BillInstance, 'dueDate'> & {
      dueDate: string | Date
    }
  >
  onDraftChange: (id: string, patch: Partial<TransactionDraft>) => void
}

export function ExpensesTable(props: Props) {
  return (
    <ImportDraftTable
      {...props}
      kind={TransactionType.EXPENSE}
    />
  )
}
