import type { ColumnFiltersState } from '@tanstack/react-table'
import { useEffect, useId, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { useTranslation } from 'react-i18next'

import type { BillPaymentHandling } from '@/api/generated/types.gen'
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
  BillOverviewAmountFilterValue,
  BillOverviewDateFilterValue,
  BillOverviewStatus
} from '@/routes/_authenticated/bills/-components/bill-overview-table'

type SelectOption = { value: string; label: string }

type PresenceFilterValue = Array<'has' | 'doesNotHave'>

export type BillOverviewFilterDrawerProps = {
  columnFilters: ColumnFiltersState
  onApply: (filters: ColumnFiltersState) => void
  availableStatuses: Array<{ value: BillOverviewStatus; label: string }>
  availableHandlings: Array<{ value: BillPaymentHandling; label: string }>
  availableAccounts: SelectOption[]
  availableBudgets: SelectOption[]
  availableCategories: SelectOption[]
  availableRecipients: SelectOption[]
  amountBounds: {
    min?: number
    max?: number
  }
  onClose: () => void
}

const FILTER_IDS = [
  'dueDate',
  'billName',
  'status',
  'amount',
  'paymentHandling',
  'account',
  'budget',
  'category',
  'recipient'
] as const

export function BillOverviewFilterDrawer({
  columnFilters,
  onApply,
  availableStatuses,
  availableHandlings,
  availableAccounts,
  availableBudgets,
  availableCategories,
  availableRecipients,
  amountBounds,
  onClose
}: BillOverviewFilterDrawerProps) {
  const { t } = useTranslation()
  const idPrefix = useId()
  const minAmountInputId = `${idPrefix}-bill-filter-min-amount`
  const maxAmountInputId = `${idPrefix}-bill-filter-max-amount`

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() =>
    readDateRangeFilter(columnFilters, 'dueDate')
  )
  const [selectedStatuses, setSelectedStatuses] = useState<
    BillOverviewStatus[]
  >(() => readArrayFilter(columnFilters, 'status', []))
  const [selectedConnections, setSelectedConnections] =
    useState<PresenceFilterValue>(() => readArrayFilter(columnFilters, 'billName', []))
  const [amountRange, setAmountRange] =
    useState<BillOverviewAmountFilterValue>(() =>
      readAmountRangeFilter<BillOverviewAmountFilterValue>(columnFilters, 'amount')
    )
  const [selectedHandlings, setSelectedHandlings] = useState<string[]>(() =>
    readArrayFilter(columnFilters, 'paymentHandling', [])
  )
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(() =>
    readArrayFilter(columnFilters, 'account', [])
  )
  const [selectedBudgets, setSelectedBudgets] = useState<string[]>(() =>
    readArrayFilter(columnFilters, 'budget', [])
  )
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() =>
    readArrayFilter(columnFilters, 'category', [])
  )
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>(() =>
    readArrayFilter(columnFilters, 'recipient', [])
  )

  useEffect(() => {
    setDateRange(readDateRangeFilter(columnFilters, 'dueDate'))
    setSelectedConnections(readArrayFilter(columnFilters, 'billName', []))
    setSelectedStatuses(readArrayFilter(columnFilters, 'status', []))
    setAmountRange(
      readAmountRangeFilter<BillOverviewAmountFilterValue>(columnFilters, 'amount')
    )
    setSelectedHandlings(readArrayFilter(columnFilters, 'paymentHandling', []))
    setSelectedAccounts(readArrayFilter(columnFilters, 'account', []))
    setSelectedBudgets(readArrayFilter(columnFilters, 'budget', []))
    setSelectedCategories(readArrayFilter(columnFilters, 'category', []))
    setSelectedRecipients(readArrayFilter(columnFilters, 'recipient', []))
  }, [columnFilters])

  const handleApply = () => {
    const nextFilters = stripDrawerFilters(columnFilters, FILTER_IDS)

    const normalizedDateRange = normalizeDateRange(dateRange) satisfies
      BillOverviewDateFilterValue | undefined

    if (normalizedDateRange) {
      nextFilters.push({ id: 'dueDate', value: normalizedDateRange })
    }

    if (selectedStatuses.length > 0) {
      nextFilters.push({ id: 'status', value: selectedStatuses })
    }

    if (selectedConnections.length === 1) {
      nextFilters.push({ id: 'billName', value: selectedConnections })
    }

    if (amountRange.min !== undefined || amountRange.max !== undefined) {
      nextFilters.push({ id: 'amount', value: amountRange })
    }

    if (selectedHandlings.length > 0) {
      nextFilters.push({ id: 'paymentHandling', value: selectedHandlings })
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

    if (selectedRecipients.length > 0) {
      nextFilters.push({ id: 'recipient', value: selectedRecipients })
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
          <p className="type-label text-gray-600">{t('bills.status')}</p>
          <div className="flex flex-col gap-3">
            {availableStatuses.map((status) => (
              <Checkbox
                key={status.value}
                id={`${idPrefix}-bill-filter-status-${status.value}`}
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
              id={`${idPrefix}-bill-filter-connected-has`}
              checked={selectedConnections.includes('has')}
              onCheckedChange={(checked) => {
                setSelectedConnections((current) =>
                  toggleFilterValue(current, 'has', checked)
                )
              }}
              label={t('common.has')}
            />
            <Checkbox
              id={`${idPrefix}-bill-filter-connected-does-not-have`}
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
          <p className="type-label text-gray-600">{t('common.handling')}</p>
          <div className="flex flex-col gap-3">
            {availableHandlings.map((handling) => (
              <Checkbox
                key={handling.value}
                id={`${idPrefix}-bill-filter-handling-${handling.value}`}
                checked={selectedHandlings.includes(handling.value)}
                onCheckedChange={(checked) => {
                  setSelectedHandlings((current) =>
                    toggleFilterValue(current, handling.value, checked)
                  )
                }}
                label={handling.label}
              />
            ))}
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
          <p className="type-label text-gray-600">{t('common.budget')}</p>
          <FilterMultiselect
            value={selectedBudgets}
            onChange={setSelectedBudgets}
            options={availableBudgets}
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
          <p className="type-label text-gray-600">{t('common.recipient')}</p>
          <FilterMultiselect
            value={selectedRecipients}
            onChange={setSelectedRecipients}
            options={availableRecipients}
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
