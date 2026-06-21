import type { TransactionType } from '@/api/generated/types.gen'

export type ImportTransactionType = TransactionType | 'uncategorized'

export type StatementParseResult = {
  accountNumber: string | null
  transactions: TransactionDraft[]
  invalidRows: InvalidStatementRow[]
}

export type TransactionDraft = {
  id: string
  sourceRowNumber: number
  originalDescription: string
  date: string
  /** Absolute value for display, matching, and API submission. */
  amount: number
  /** Raw signed value from the statement (`Belopp` column). */
  signedAmount: number
  type: ImportTransactionType
  name: string
  originAccountId: string
  transferFromAccountId?: string
  transferToAccountId?: string
  recipientId?: string
  incomeSourceId?: string
  incomeInstanceId?: string
  billInstanceId?: string
  budgetId?: string | null
  categoryId?: string | null
  newCategoryName?: string | null
  newRecipientName?: string | null
  newIncomeSourceName?: string | null
  excluded: boolean
  parseWarnings?: string[]
}

export type InvalidStatementRow = {
  sourceRowNumber: number
  rawValues: unknown[]
  reason: string
}

export type ImportLookupItem = {
  id: string
  name: string
  archived?: boolean
  externalIdentifier?: string | null
}
