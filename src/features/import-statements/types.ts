import type { TransactionType } from '@/api/generated/types.gen'

export type ImportTransactionType = TransactionType | 'uncategorized'

export type StatementParseResult = {
  accountNumber: string | null
  transactions: TransactionDraft[]
  invalidRows: InvalidStatementRow[]
}

/** One uploaded statement file and what the parser found in it. */
export type ImportStatement = {
  fileName: string
  result: StatementParseResult
}

export type TransactionDraft = {
  id: string
  /** Which uploaded file the row came from (position in the upload). */
  statementIndex?: number
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
  /**
   * Saved transaction this row already exists as. Such rows start excluded so
   * overlapping statement periods do not create duplicates.
   */
  duplicateOfTransactionId?: string
  /**
   * The row in another uploaded statement that is the other side of the same
   * transfer. The outgoing side is imported; the incoming side starts excluded.
   */
  pairedWithDraftId?: string
  parseWarnings?: string[]
}

export type InvalidStatementRow = {
  /** Set when several files are imported together. */
  fileName?: string
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
