import { format } from 'date-fns'
import { ArrowRightLeft, TrendingDown, TrendingUp } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { TransactionType } from '@/api/generated/types.gen'
import { Button } from '@/components/button/button'
import { InfoCard } from '@/components/info-card/info-card'
import type { LatestAccountTransaction } from '../already-imported'
import type { ImportLookupItem, TransactionDraft } from '../types'
import { formatSwedishMoney } from '../utils/money'
import { DraftSelect, SelectOptionList } from './import-table-fields'

export type SummaryStatement = {
  fileName: string
  originAccountId: string
  /** Newest saved transaction on the chosen account, when there is one. */
  latestTransaction: LatestAccountTransaction | null
}

export type SummaryProps = {
  drafts: TransactionDraft[]
  statements: SummaryStatement[]
  accounts: ImportLookupItem[]
  onOriginAccountChange: (statementIndex: number, accountId: string) => void
  onChangeFile: () => void
}

const ROW_SEPARATOR = ' / '

function summary(drafts: TransactionDraft[]) {
  const included = drafts.filter((draft) => !draft.excluded)
  return {
    totalRows: drafts.length,
    includedRows: included.length,
    excludedRows: drafts.length - included.length,
    alreadyImportedRows: drafts.filter(
      (draft) => draft.excluded && draft.duplicateOfTransactionId
    ).length,
    // Each pair has one excluded side, so this counts transfers, not rows.
    pairedTransfers: drafts.filter(
      (draft) =>
        draft.excluded &&
        draft.pairedWithDraftId &&
        !draft.duplicateOfTransactionId
    ).length,
    income: included
      .filter((draft) => draft.type === TransactionType.INCOME)
      .reduce((sum, draft) => sum + draft.amount, 0),
    expenses: included
      .filter((draft) => draft.type === TransactionType.EXPENSE)
      .reduce((sum, draft) => sum + draft.amount, 0),
    transfers: included
      .filter((draft) => draft.type === TransactionType.TRANSFER)
      .reduce((sum, draft) => sum + draft.amount, 0)
  }
}

function RowsInfoCard({
  included,
  excluded,
  total,
  label
}: {
  included: number
  excluded: number
  total: number
  label: string
}) {
  return (
    <div className="flex min-w-0 flex-col gap-4 rounded-lg bg-gray-100 p-4 ring-1 ring-black/5 dark:ring-white/10">
      <span className="type-label text-muted-foreground">{label}</span>
      <div className="type-title-sans-large-medium">
        <span className="text-green-700">{included}</span>
        <span className="text-muted-foreground">{ROW_SEPARATOR}</span>
        <span className="text-red-700">{excluded}</span>
        <span className="text-foreground">{` (${total})`}</span>
      </div>
    </div>
  )
}

function StatementAccountField({
  statement,
  statementIndex,
  accounts,
  onOriginAccountChange
}: {
  statement: SummaryStatement
  statementIndex: number
  accounts: ImportLookupItem[]
  onOriginAccountChange: SummaryProps['onOriginAccountChange']
}) {
  const inputId = useId()
  const { t } = useTranslation()
  const latest = statement.latestTransaction

  return (
    <div className="flex flex-col gap-1">
      {statement.fileName ? (
        <span
          className="type-body-medium max-w-80 truncate text-gray-700"
          title={statement.fileName}
        >
          {statement.fileName}
        </span>
      ) : null}
      <label
        className="type-label text-gray-800"
        htmlFor={inputId}
      >
        {t('statementImport.table.originAccount')}
      </label>
      <DraftSelect
        id={inputId}
        value={statement.originAccountId}
        onChange={(accountId) =>
          onOriginAccountChange(statementIndex, accountId)
        }
      >
        <option value="">{t('statementImport.table.chooseAccount')}</option>
        <SelectOptionList items={accounts} />
      </DraftSelect>
      {statement.originAccountId ? (
        <p className="type-label text-gray-600">
          {latest
            ? t('statementImport.summary.latestTransaction', {
                date: format(latest.date, 'yyyy-MM-dd'),
                name: latest.name,
                amount: formatSwedishMoney(latest.amount)
              })
            : t('statementImport.summary.noSavedTransactions')}
        </p>
      ) : null}
    </div>
  )
}

export function Summary({
  drafts,
  statements,
  accounts,
  onOriginAccountChange,
  onChangeFile
}: SummaryProps) {
  const { t } = useTranslation()
  const totals = summary(drafts)

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-4">
          {statements.map((statement, statementIndex) => (
            <StatementAccountField
              // Files keep their position for as long as this upload is shown.
              // biome-ignore lint/suspicious/noArrayIndexKey: position is the statement's identity
              key={statementIndex}
              statement={statement}
              statementIndex={statementIndex}
              accounts={accounts}
              onOriginAccountChange={onOriginAccountChange}
            />
          ))}
          <div className="flex">
            <Button
              variant="outlined"
              color="subtle"
              label={t('statementImport.table.changeFile')}
              onClick={onChangeFile}
            />
          </div>
        </div>

        <div className="flex max-w-full flex-row flex-nowrap justify-end gap-2 overflow-x-auto">
          <RowsInfoCard
            label={t('statementImport.summary.rows')}
            included={totals.includedRows}
            excluded={totals.excludedRows}
            total={totals.totalRows}
          />
          <InfoCard
            color="green"
            icon={
              <TrendingUp
                className="stroke-[1.5]"
                aria-hidden={true}
              />
            }
            label={t('transactions.income')}
            value={formatSwedishMoney(totals.income)}
          />
          <InfoCard
            color="red"
            icon={
              <TrendingDown
                className="stroke-[1.5]"
                aria-hidden={true}
              />
            }
            label={t('statementImport.sections.expenses')}
            value={formatSwedishMoney(totals.expenses)}
          />
          <InfoCard
            color="blue"
            icon={
              <ArrowRightLeft
                className="stroke-[1.5]"
                aria-hidden={true}
              />
            }
            label={t('statementImport.sections.transfers')}
            value={formatSwedishMoney(totals.transfers)}
          />
        </div>
      </div>
      {totals.alreadyImportedRows > 0 || totals.pairedTransfers > 0 ? (
        <div className="flex flex-col gap-1">
          {totals.alreadyImportedRows > 0 ? (
            <p className="type-body-medium text-gray-700">
              {t('statementImport.summary.alreadyImported', {
                count: totals.alreadyImportedRows
              })}
            </p>
          ) : null}
          {totals.pairedTransfers > 0 ? (
            <p className="type-body-medium text-gray-700">
              {t('statementImport.summary.pairedTransfers', {
                count: totals.pairedTransfers
              })}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
