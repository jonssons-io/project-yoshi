import type { ColumnFiltersState } from '@tanstack/react-table'
import { useEffect, useId, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { useTranslation } from 'react-i18next'
import type { IncomeInstanceStatus } from '@/api/generated/types.gen'
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
  IncomeAmountFilterValue,
  IncomeDateFilterValue
} from '@/routes/_authenticated/income/-components/income-overview-table'

type SelectOption = {
  value: string
  label: string
}

type PresenceFilterValue = Array<'has' | 'doesNotHave'>

export type IncomeTableFilterDrawerProps = {
  columnFilters: ColumnFiltersState
  onApply: (filters: ColumnFiltersState) => void
  availableStatuses: Array<{
    value: IncomeInstanceStatus
    label: string
  }>
  availableAccounts: SelectOption[]
  availableCategories: SelectOption[]
  availableSenders: SelectOption[]
  amountBounds: {
    min?: number
    max?: number
  }
  onClose: () => void
}

const FILTER_IDS = [
  'expectedDate',
  'status',
  'incomeName',
  'amount',
  'account',
  'category',
  'sender'
] as const

/**
 * Filter drawer for the income overview table.
 */
export function IncomeTableFilterDrawer({
  columnFilters,
  onApply,
  availableStatuses,
  availableAccounts,
  availableCategories,
  availableSenders,
  amountBounds,
  onClose
}: IncomeTableFilterDrawerProps) {
  const { t } = useTranslation()
  const idPrefix = useId()
  const minAmountInputId = `${idPrefix}-income-filter-min-amount`
  const maxAmountInputId = `${idPrefix}-income-filter-max-amount`

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() =>
    readDateRangeFilter(columnFilters, 'expectedDate')
  )
  const [selectedStatuses, setSelectedStatuses] = useState<
    IncomeInstanceStatus[]
  >(() => readArrayFilter(columnFilters, 'status', []))
  const [selectedConnections, setSelectedConnections] =
    useState<PresenceFilterValue>(() =>
      readArrayFilter(columnFilters, 'incomeName', [])
    )
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(() =>
    readArrayFilter(columnFilters, 'account', [])
  )
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() =>
    readArrayFilter(columnFilters, 'category', [])
  )
  const [selectedSenders, setSelectedSenders] = useState<string[]>(() =>
    readArrayFilter(columnFilters, 'sender', [])
  )
  const [amountRange, setAmountRange] = useState<IncomeAmountFilterValue>(() =>
    readAmountRangeFilter<IncomeAmountFilterValue>(columnFilters, 'amount')
  )

  useEffect(() => {
    setDateRange(readDateRangeFilter(columnFilters, 'expectedDate'))
    setSelectedStatuses(readArrayFilter(columnFilters, 'status', []))
    setSelectedConnections(readArrayFilter(columnFilters, 'incomeName', []))
    setSelectedAccounts(readArrayFilter(columnFilters, 'account', []))
    setSelectedCategories(readArrayFilter(columnFilters, 'category', []))
    setSelectedSenders(readArrayFilter(columnFilters, 'sender', []))
    setAmountRange(
      readAmountRangeFilter<IncomeAmountFilterValue>(columnFilters, 'amount')
    )
  }, [
    columnFilters
  ])

  const handleApply = () => {
    const nextFilters = stripDrawerFilters(columnFilters, FILTER_IDS)

    const normalizedDateRange = normalizeDateRange(dateRange) satisfies
      | IncomeDateFilterValue
      | undefined

    const normalizedAmountRange: IncomeAmountFilterValue = {
      min: amountRange.min,
      max: amountRange.max
    }

    if (normalizedDateRange) {
      nextFilters.push({
        id: 'expectedDate',
        value: normalizedDateRange
      })
    }

    if (selectedStatuses.length > 0) {
      nextFilters.push({
        id: 'status',
        value: selectedStatuses
      })
    }

    if (selectedConnections.length === 1) {
      nextFilters.push({
        id: 'incomeName',
        value: selectedConnections
      })
    }

    if (selectedAccounts.length > 0) {
      nextFilters.push({
        id: 'account',
        value: selectedAccounts
      })
    }

    if (selectedCategories.length > 0) {
      nextFilters.push({
        id: 'category',
        value: selectedCategories
      })
    }

    if (selectedSenders.length > 0) {
      nextFilters.push({
        id: 'sender',
        value: selectedSenders
      })
    }

    if (
      normalizedAmountRange.min !== undefined ||
      normalizedAmountRange.max !== undefined
    ) {
      nextFilters.push({
        id: 'amount',
        value: normalizedAmountRange
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
        <div className="flex flex-col gap-2">
          <p className="type-label text-gray-600">{t('common.date')}</p>
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            placeholder={t('common.pickDate')}
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="type-label text-gray-600">{t('transactions.status')}</p>
          <div className="flex flex-col gap-3">
            {availableStatuses.map((status) => (
              <Checkbox
                key={status.value}
                id={`income-filter-status-${status.value}`}
                checked={selectedStatuses.includes(status.value)}
                onCheckedChange={(checked) => {
                  setSelectedStatuses((current) =>
                    toggleFilterValue(current, status.value, checked)
                  )
                }}
                label={status.label}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="type-label text-gray-600">
            {t('common.linkedTransaction')}
          </p>
          <div className="flex flex-col gap-3">
            <Checkbox
              id={`${idPrefix}-income-filter-connected-has`}
              checked={selectedConnections.includes('has')}
              onCheckedChange={(checked) => {
                setSelectedConnections((current) =>
                  toggleFilterValue(current, 'has', checked)
                )
              }}
              label={t('common.has')}
            />
            <Checkbox
              id={`${idPrefix}-income-filter-connected-does-not-have`}
              checked={selectedConnections.includes('doesNotHave')}
              onCheckedChange={(checked) => {
                setSelectedConnections((current) =>
                  toggleFilterValue(current, 'doesNotHave', checked)
                )
              }}
              label={t('common.doesNotHave')}
            />
          </div>
        </div>

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
                  setAmountRange((current) => ({
                    ...current,
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
                  setAmountRange((current) => ({
                    ...current,
                    max: value
                  }))
                }}
              />
            </div>
          </div>
        </div>

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

        <div className="flex flex-col gap-2">
          <p className="type-label text-gray-600">{t('income.sender')}</p>
          <FilterMultiselect
            value={selectedSenders}
            onChange={setSelectedSenders}
            options={availableSenders}
            placeholder={t('common.selectAnOption')}
            searchPlaceholder={t('common.search')}
          />
        </div>
      </div>

      <FilterDrawerFooter
        onReset={handleReset}
        onApply={handleApply}
      />
    </div>
  )
}
