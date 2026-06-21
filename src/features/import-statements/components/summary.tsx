import { ArrowRightLeft, TrendingDown, TrendingUp } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { TransactionType } from '@/api/generated/types.gen'
import { Button } from '@/components/button/button'
import { InfoCard } from '@/components/info-card/info-card'
import type { ImportLookupItem, TransactionDraft } from '../types'
import { formatSwedishMoney } from '../utils/money'
import { DraftSelect, SelectOptionList } from './import-table-fields'

export type SummaryProps = {
  drafts: TransactionDraft[]
  fileName: string
  accounts: ImportLookupItem[]
  originAccountId: string
  onOriginAccountChange: (accountId: string) => void
  onChangeFile: () => void
}

const ROW_SEPARATOR = ' / '

function summary(drafts: TransactionDraft[]) {
  const included = drafts.filter((draft) => !draft.excluded)
  return {
    totalRows: drafts.length,
    includedRows: included.length,
    excludedRows: drafts.length - included.length,
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

export function Summary({
  drafts,
  fileName,
  accounts,
  originAccountId,
  onOriginAccountChange,
  onChangeFile
}: SummaryProps) {
  const originAccountInputId = useId()
  const { t } = useTranslation()
  const totals = summary(drafts)

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {fileName ? (
              <span
                className="type-body-medium max-w-64 truncate text-gray-700"
                title={fileName}
              >
                {fileName}
              </span>
            ) : null}
            <Button
              variant="outlined"
              color="subtle"
              label={t('statementImport.table.changeFile')}
              onClick={onChangeFile}
            />
          </div>
          <label
            className="type-label text-gray-800"
            htmlFor={originAccountInputId}
          >
            {t('statementImport.table.originAccount')}
          </label>
          <DraftSelect
            id={originAccountInputId}
            value={originAccountId}
            onChange={onOriginAccountChange}
          >
            <option value="">{t('statementImport.table.chooseAccount')}</option>
            <SelectOptionList items={accounts} />
          </DraftSelect>
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
    </section>
  )
}
