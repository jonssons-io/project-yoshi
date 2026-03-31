import type { ColumnFiltersState } from '@tanstack/react-table'
import { useEffect, useId, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { useTranslation } from 'react-i18next'

import { TransactionType } from '@/api/generated/types.gen'
import { Checkbox } from '@/components/checkbox/checkbox'
import { DateRangePicker } from '@/components/date-range-picker/date-range-picker'
import { FilterMultiselect } from '@/components/filter-multiselect/filter-multiselect'
import { NumericInput } from '@/components/numeric-input/numeric-input'
import { FilterDrawerFooter } from '@/drawers/filter-drawer-footer'
import {
  normalizeDateRange,
  readAmountRangeFilter,
  readArrayFilter,
  readDateRangeFilter,
  stripDrawerFilters,
  toggleFilterValue
} from '@/drawers/filter-drawer-helpers'
import type {
  TransactionAmountFilterValue,
  TransactionDateFilterValue
} from '@/routes/_authenticated/transactions/-components/transactions-table'

type SelectOption = { value: string; label: string }

const TYPE_ORDER: TransactionType[] = [
  TransactionType.INCOME,
  TransactionType.EXPENSE,
  TransactionType.TRANSFER
]

const FILTER_IDS = [
  'date',
  'type',
  'name',
  'amount',
  'account',
  'budget',
  'category',
  'recipientSender'
] as const

type PresenceFilterValue = Array<'has' | 'doesNotHave'>

export type TransactionsTableFilterDrawerProps = {
  columnFilters: ColumnFiltersState
  onApply: (filters: ColumnFiltersState) => void
  availableTransactionTypes: TransactionType[]
  availableAccounts: SelectOption[]
  availableBudgets: SelectOption[]
  availableCategories: SelectOption[]
  availableRecipientsSenders: SelectOption[]
  amountBounds: {
    min?: number
    max?: number
  }
  onClose: () => void
}

/**
 * Filter drawer body for the transactions table.
 */
export function TransactionsTableFilterDrawer({
  columnFilters,
  onApply,
  availableTransactionTypes,
  availableAccounts,
  availableBudgets,
  availableCategories,
  availableRecipientsSenders,
  amountBounds,
  onClose
}: TransactionsTableFilterDrawerProps) {
  const { t } = useTranslation()
  const idPrefix = useId()
  const minAmountInputId = `${idPrefix}-tx-filter-min-amount`
  const maxAmountInputId = `${idPrefix}-tx-filter-max-amount`

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() =>
    readDateRangeFilter(columnFilters, 'date')
  )
  const [selectedTypes, setSelectedTypes] = useState<TransactionType[]>(() =>
    readArrayFilter(columnFilters, 'type')
  )
  const [selectedConnections, setSelectedConnections] =
    useState<PresenceFilterValue>(() => readArrayFilter(columnFilters, 'name'))
  const [amountRange, setAmountRange] =
    useState<TransactionAmountFilterValue>(() =>
      readAmountRangeFilter<TransactionAmountFilterValue>(columnFilters, 'amount')
    )
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(() =>
    readArrayFilter(columnFilters, 'account')
  )
  const [selectedBudgets, setSelectedBudgets] = useState<string[]>(() =>
    readArrayFilter(columnFilters, 'budget')
  )
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() =>
    readArrayFilter(columnFilters, 'category')
  )
  const [selectedRecipientsSenders, setSelectedRecipientsSenders] = useState<
    string[]
  >(() => readArrayFilter(columnFilters, 'recipientSender'))

  useEffect(() => {
    setDateRange(readDateRangeFilter(columnFilters, 'date'))
    setSelectedTypes(readArrayFilter(columnFilters, 'type'))
    setSelectedConnections(readArrayFilter(columnFilters, 'name'))
    setAmountRange(
      readAmountRangeFilter<TransactionAmountFilterValue>(columnFilters, 'amount')
    )
    setSelectedAccounts(readArrayFilter(columnFilters, 'account'))
    setSelectedBudgets(readArrayFilter(columnFilters, 'budget'))
    setSelectedCategories(readArrayFilter(columnFilters, 'category'))
    setSelectedRecipientsSenders(
      readArrayFilter(columnFilters, 'recipientSender')
    )
  }, [columnFilters])

  const typeLabel = (type: TransactionType): string => {
    if (type === TransactionType.INCOME) return t('transactions.income')
    if (type === TransactionType.EXPENSE) return t('transactions.expense')
    return t('common.transfer')
  }

  const orderedTypes = TYPE_ORDER.filter((type) =>
    availableTransactionTypes.includes(type)
  )

  const handleApply = () => {
    const nextFilters = stripDrawerFilters(columnFilters, FILTER_IDS)

    const normalizedDateRange = normalizeDateRange(dateRange) satisfies
      TransactionDateFilterValue | undefined

    if (normalizedDateRange) {
      nextFilters.push({ id: 'date', value: normalizedDateRange })
    }

    if (selectedTypes.length > 0) {
      nextFilters.push({ id: 'type', value: selectedTypes })
    }

    if (selectedConnections.length === 1) {
      nextFilters.push({ id: 'name', value: selectedConnections })
    }

    if (amountRange.min !== undefined || amountRange.max !== undefined) {
      nextFilters.push({ id: 'amount', value: amountRange })
    }

    if (selectedAccounts.length > 0) {
      nextFilters.push({ id: 'account', value: selectedAccounts })
    }

    if (selectedBudgets.length > 0) {
      nextFilters.push({ id: 'budget', value: selectedBudgets })
    }

    if (selectedCategories.length > 0) {
      nextFilters.push({ id: 'category', value: selectedCategories })
    }

    if (selectedRecipientsSenders.length > 0) {
      nextFilters.push({
        id: 'recipientSender',
        value: selectedRecipientsSenders
      })
    }

    onApply(nextFilters)
    onClose()
  }

  const handleReset = () => {
    onApply(stripDrawerFilters(columnFilters, FILTER_IDS))
    onClose()
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        {/* Date range */}
        <div className="flex flex-col gap-2">
          <p className="type-label text-gray-600">{t('common.date')}</p>
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            placeholder={t('common.pickDate')}
          />
        </div>

        {/* Transaction type (always ≤3 so checkboxes) */}
        {orderedTypes.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="type-label text-gray-600">
              {t('forms.transactionType')}
            </p>
            <div className="flex flex-col gap-3">
              {orderedTypes.map((type) => (
                <Checkbox
                  key={type}
                  id={`${idPrefix}-tx-filter-type-${type}`}
                  checked={selectedTypes.includes(type)}
                  onCheckedChange={(checked) =>
                    setSelectedTypes((prev) =>
                      toggleFilterValue(prev, type, checked)
                    )
                  }
                  label={typeLabel(type)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <p className="type-label text-gray-600">
            {t('transactions.scheduledLink')}
          </p>
          <div className="flex flex-col gap-3">
            <Checkbox
              id={`${idPrefix}-tx-filter-connected-has`}
              checked={selectedConnections.includes('has')}
              onCheckedChange={(checked) =>
                setSelectedConnections((prev) =>
                  toggleFilterValue(prev, 'has', checked)
                )
              }
              label={t('common.has')}
            />
            <Checkbox
              id={`${idPrefix}-tx-filter-connected-does-not-have`}
              checked={selectedConnections.includes('doesNotHave')}
              onCheckedChange={(checked) =>
                setSelectedConnections((prev) =>
                  toggleFilterValue(prev, 'doesNotHave', checked)
                )
              }
              label={t('common.doesNotHave')}
            />
          </div>
        </div>

        {/* Amount range */}
        <div className="flex flex-col gap-2">
          <p className="type-label text-gray-600">{t('common.amount')}</p>
          <div className="flex flex-row gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <label
                className="type-label text-gray-600"
                htmlFor={minAmountInputId}
              >
                {t('common.from')}
              </label>
              <NumericInput
                id={minAmountInputId}
                unit={t('common.currencyCode')}
                min={amountBounds.min}
                max={amountRange.max ?? amountBounds.max}
                value={amountRange.min}
                onValueChange={(value) => {
                  setAmountRange((cur) => ({
                    ...cur,
                    min: value
                  }))
                }}
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <label
                className="type-label text-gray-600"
                htmlFor={maxAmountInputId}
              >
                {t('common.to')}
              </label>
              <NumericInput
                id={maxAmountInputId}
                unit={t('common.currencyCode')}
                min={amountRange.min ?? amountBounds.min}
                max={amountBounds.max}
                value={amountRange.max}
                onValueChange={(value) => {
                  setAmountRange((cur) => ({
                    ...cur,
                    max: value
                  }))
                }}
              />
            </div>
          </div>
        </div>

        {/* Account */}
        {availableAccounts.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="type-label text-gray-600">{t('common.account')}</p>
            <FilterMultiselect
              value={selectedAccounts}
              onChange={setSelectedAccounts}
              options={availableAccounts}
              placeholder={t('common.selectAnOption')}
              searchPlaceholder={t('common.search')}
            />
          </div>
        )}

        {/* Budget */}
        {availableBudgets.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="type-label text-gray-600">{t('common.budget')}</p>
            <FilterMultiselect
              value={selectedBudgets}
              onChange={setSelectedBudgets}
              options={availableBudgets}
              placeholder={t('common.selectAnOption')}
              searchPlaceholder={t('common.search')}
            />
          </div>
        )}

        {/* Category */}
        {availableCategories.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="type-label text-gray-600">{t('common.category')}</p>
            <FilterMultiselect
              value={selectedCategories}
              onChange={setSelectedCategories}
              options={availableCategories}
              placeholder={t('common.selectAnOption')}
              searchPlaceholder={t('common.search')}
            />
          </div>
        )}

        {/* Recipient / Sender */}
        {availableRecipientsSenders.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="type-label text-gray-600">
              {t('common.recipientSender')}
            </p>
            <FilterMultiselect
              value={selectedRecipientsSenders}
              onChange={setSelectedRecipientsSenders}
              options={availableRecipientsSenders}
              placeholder={t('common.selectAnOption')}
              searchPlaceholder={t('common.search')}
            />
          </div>
        )}
      </div>

      <FilterDrawerFooter
        onReset={handleReset}
        onApply={handleApply}
      />
    </div>
  )
}
