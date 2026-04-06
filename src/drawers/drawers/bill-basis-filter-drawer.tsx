import type { ColumnFiltersState } from '@tanstack/react-table'
import { useEffect, useId, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { useTranslation } from 'react-i18next'

import type {
  BillPaymentHandling,
  RecurrenceType
} from '@/api/generated/types.gen'
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

type SelectOption = {
  value: string
  label: string
}
type PresenceFilterValue = Array<'has' | 'doesNotHave'>

type BillBasisDateFilterValue = {
  from?: string
  to?: string
}

type BillBasisAmountFilterValue = {
  min?: number
  max?: number
}

const FILTER_IDS = [
  'period',
  'recurrence',
  'revisions',
  'amount',
  'paymentHandling',
  'account',
  'budget',
  'category',
  'recipient'
] as const

export type BillBasisFilterDrawerProps = {
  columnFilters: ColumnFiltersState
  onApply: (filters: ColumnFiltersState) => void
  availableRecurrences: Array<{
    value: RecurrenceType
    label: string
  }>
  availableHandlings: Array<{
    value: BillPaymentHandling
    label: string
  }>
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

export function BillBasisFilterDrawer({
  columnFilters,
  onApply,
  availableRecurrences,
  availableHandlings,
  availableAccounts,
  availableBudgets,
  availableCategories,
  availableRecipients,
  amountBounds,
  onClose
}: BillBasisFilterDrawerProps) {
  const { t } = useTranslation()
  const idPrefix = useId()
  const minAmountInputId = `${idPrefix}-bill-basis-filter-min-amount`
  const maxAmountInputId = `${idPrefix}-bill-basis-filter-max-amount`

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() =>
    readDateRangeFilter(columnFilters, 'period')
  )
  const [selectedRecurrences, setSelectedRecurrences] = useState<
    RecurrenceType[]
  >(() => readArrayFilter(columnFilters, 'recurrence', []))
  const [selectedRevisionStates, setSelectedRevisionStates] =
    useState<PresenceFilterValue>(() =>
      readArrayFilter(columnFilters, 'revisions', [])
    )
  const [amountRange, setAmountRange] = useState<BillBasisAmountFilterValue>(
    () =>
      readAmountRangeFilter<BillBasisAmountFilterValue>(columnFilters, 'amount')
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
    setDateRange(readDateRangeFilter(columnFilters, 'period'))
    setSelectedRecurrences(readArrayFilter(columnFilters, 'recurrence', []))
    setSelectedRevisionStates(readArrayFilter(columnFilters, 'revisions', []))
    setAmountRange(
      readAmountRangeFilter<BillBasisAmountFilterValue>(columnFilters, 'amount')
    )
    setSelectedHandlings(readArrayFilter(columnFilters, 'paymentHandling', []))
    setSelectedAccounts(readArrayFilter(columnFilters, 'account', []))
    setSelectedBudgets(readArrayFilter(columnFilters, 'budget', []))
    setSelectedCategories(readArrayFilter(columnFilters, 'category', []))
    setSelectedRecipients(readArrayFilter(columnFilters, 'recipient', []))
  }, [
    columnFilters
  ])

  const handleApply = () => {
    const nextFilters = stripDrawerFilters(columnFilters, FILTER_IDS)

    const normalizedDateRange = normalizeDateRange(dateRange) satisfies
      | BillBasisDateFilterValue
      | undefined

    if (normalizedDateRange) {
      nextFilters.push({
        id: 'period',
        value: normalizedDateRange
      })
    }

    if (selectedRecurrences.length > 0) {
      nextFilters.push({
        id: 'recurrence',
        value: selectedRecurrences
      })
    }

    if (selectedRevisionStates.length === 1) {
      nextFilters.push({
        id: 'revisions',
        value: selectedRevisionStates
      })
    }

    if (amountRange.min !== undefined || amountRange.max !== undefined) {
      nextFilters.push({
        id: 'amount',
        value: amountRange
      })
    }

    if (selectedHandlings.length > 0) {
      nextFilters.push({
        id: 'paymentHandling',
        value: selectedHandlings
      })
    }

    if (selectedAccounts.length > 0) {
      nextFilters.push({
        id: 'account',
        value: selectedAccounts
      })
    }

    if (selectedBudgets.length > 0) {
      nextFilters.push({
        id: 'budget',
        value: selectedBudgets
      })
    }

    if (selectedCategories.length > 0) {
      nextFilters.push({
        id: 'category',
        value: selectedCategories
      })
    }

    if (selectedRecipients.length > 0) {
      nextFilters.push({
        id: 'recipient',
        value: selectedRecipients
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
          <p className="type-label text-gray-600">{t('recurrence.label')}</p>
          <FilterMultiselect
            value={selectedRecurrences}
            onChange={(values) =>
              setSelectedRecurrences(values as RecurrenceType[])
            }
            options={availableRecurrences}
            placeholder={t('common.selectAnOption')}
            searchPlaceholder={t('common.search')}
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="type-label text-gray-600">
            {t('bills.basisData.columns.revisions')}
          </p>
          <div className="flex flex-col gap-3">
            <Checkbox
              id={`${idPrefix}-bill-basis-filter-revisions-has`}
              checked={selectedRevisionStates.includes('has')}
              onCheckedChange={(checked) => {
                setSelectedRevisionStates((current) =>
                  toggleFilterValue(current, 'has', checked)
                )
              }}
              label={t('common.has')}
            />
            <Checkbox
              id={`${idPrefix}-bill-basis-filter-revisions-does-not-have`}
              checked={selectedRevisionStates.includes('doesNotHave')}
              onCheckedChange={(checked) => {
                setSelectedRevisionStates((current) =>
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
                id={`${idPrefix}-bill-basis-filter-handling-${handling.value}`}
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
