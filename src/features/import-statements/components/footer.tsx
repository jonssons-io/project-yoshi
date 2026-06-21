import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { TransactionType } from '@/api/generated/types.gen'
import { Button } from '@/components/button/button'
import type { InvalidStatementRow, TransactionDraft } from '../types'
import {
  hasImportCategory,
  hasImportIncomeSource,
  hasImportRecipient
} from './import-table-fields'

export function importValidationMessages(
  drafts: TransactionDraft[],
  t: TFunction
): string[] {
  const messages: string[] = []
  const included = drafts.filter((draft) => !draft.excluded)

  if (included.length === 0) {
    messages.push(t('statementImport.validation.noIncludedRows'))
  }
  if (included.some((draft) => !draft.originAccountId)) {
    messages.push(t('statementImport.validation.originAccountRequired'))
  }
  if (
    included.some(
      (draft) =>
        draft.type === TransactionType.EXPENSE &&
        (!draft.budgetId ||
          !hasImportCategory(draft) ||
          !hasImportRecipient(draft))
    )
  ) {
    messages.push(t('statementImport.validation.expenseRequiredFields'))
  }
  if (
    included.some(
      (draft) =>
        draft.type === TransactionType.INCOME &&
        (!hasImportCategory(draft) || !hasImportIncomeSource(draft))
    )
  ) {
    messages.push(t('statementImport.validation.incomeRequiredFields'))
  }
  if (
    included.some(
      (draft) =>
        draft.type === TransactionType.TRANSFER &&
        (!draft.transferToAccountId || draft.amount <= 0)
    )
  ) {
    messages.push(t('statementImport.validation.transferInvalid'))
  }
  if (included.some((draft) => draft.type === 'uncategorized')) {
    messages.push(t('statementImport.validation.uncategorizedRows'))
  }

  return messages
}

export function Footer({
  validationMessages,
  invalidRows,
  isSubmitting,
  onImport
}: {
  validationMessages: string[]
  invalidRows: InvalidStatementRow[]
  isSubmitting: boolean
  onImport: () => void
}) {
  const { t } = useTranslation()
  const isValid = validationMessages.length === 0 && invalidRows.length === 0

  return (
    <section className="flex flex-col gap-4 border-t border-gray-200 pt-4">
      <div className="flex flex-col gap-2">
        <h2 className="type-heading-3 text-gray-950">
          {t('statementImport.footer.title')}
        </h2>
        <p className="type-body-medium text-gray-600">
          {t('statementImport.footer.description')}
        </p>
        {isValid ? (
          <p className="type-body-medium text-green-700">
            {t('statementImport.footer.ready')}
          </p>
        ) : (
          <div className="flex flex-col gap-1 text-red-700">
            {invalidRows.map((row) => (
              <p
                key={row.sourceRowNumber}
                className="type-body-medium"
              >
                {t('statementImport.table.skippedRowReason', {
                  row: row.sourceRowNumber,
                  reason: t(row.reason)
                })}
              </p>
            ))}
            {validationMessages.map((message) => (
              <p
                key={message}
                className="type-body-medium"
              >
                {message}
              </p>
            ))}
          </div>
        )}
      </div>
      <div className="flex">
        <Button
          label={
            isSubmitting
              ? t('statementImport.footer.submitting')
              : t('statementImport.footer.submit')
          }
          onClick={onImport}
          disabled={!isValid || isSubmitting}
        />
      </div>
    </section>
  )
}
