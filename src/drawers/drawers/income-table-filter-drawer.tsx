import type { ColumnFiltersState } from '@tanstack/react-table'
import { endOfDay, startOfDay } from 'date-fns'
import { CheckIcon, Undo2Icon } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/button/button'
import { Checkbox } from '@/components/checkbox/checkbox'
import { DateRangePicker } from '@/components/date-range-picker/date-range-picker'
import { FilterMultiselect } from '@/components/filter-multiselect/filter-multiselect'
import {
  InputShell,
  inputInnerClassName
} from '@/components/input-shell/input-shell'
import type {
  IncomeAmountFilterValue,
  IncomeDateFilterValue,
  IncomeOverviewStatus
} from '@/routes/_authenticated/income/-components/income-overview-table'

type SelectOption = {
  value: string
  label: string
}

export type IncomeTableFilterDrawerProps = {
  columnFilters: ColumnFiltersState
  onApply: (filters: ColumnFiltersState) => void
  availableStatuses: Array<{
    value: IncomeOverviewStatus
    label: string
  }>
  availableAccounts: SelectOption[]
  availableCategories: SelectOption[]
  availableSenders: SelectOption[]
  onClose: () => void
}

function readArrayFilter<T extends string>(
  columnFilters: ColumnFiltersState,
  columnId: string,
  fallback: T[]
): T[] {
  const match = columnFilters.find((filter) => filter.id === columnId)?.value
  if (!Array.isArray(match)) return fallback
  return match as T[]
}

function readDateFilter(
  columnFilters: ColumnFiltersState
): DateRange | undefined {
  const match = columnFilters.find((filter) => filter.id === 'expectedDate')
    ?.value as IncomeDateFilterValue | undefined
  if (!match?.from && !match?.to) return undefined
  return {
    from: match?.from ? new Date(match.from) : undefined,
    to: match?.to ? new Date(match.to) : undefined
  }
}

function readAmountFilter(
  columnFilters: ColumnFiltersState
): IncomeAmountFilterValue {
  const match = columnFilters.find((filter) => filter.id === 'amount')?.value
  if (!match || typeof match !== 'object') return {}
  return match as IncomeAmountFilterValue
}

function toggleValue<T extends string>(
  current: T[],
  nextValue: T,
  checked: boolean
): T[] {
  if (checked) {
    return current.includes(nextValue)
      ? current
      : [
          ...current,
          nextValue
        ]
  }

  return current.filter((value) => value !== nextValue)
}

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
  onClose
}: IncomeTableFilterDrawerProps) {
  const { t } = useTranslation()
  const idPrefix = useId()
  const minAmountInputId = `${idPrefix}-income-filter-min-amount`
  const maxAmountInputId = `${idPrefix}-income-filter-max-amount`

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() =>
    readDateFilter(columnFilters)
  )
  const [selectedStatuses, setSelectedStatuses] = useState<
    IncomeOverviewStatus[]
  >(() =>
    readArrayFilter(
      columnFilters,
      'status',
      availableStatuses.map((status) => status.value)
    )
  )
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(() =>
    readArrayFilter(
      columnFilters,
      'account',
      availableAccounts.map((item) => item.value)
    )
  )
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() =>
    readArrayFilter(
      columnFilters,
      'category',
      availableCategories.map((item) => item.value)
    )
  )
  const [selectedSenders, setSelectedSenders] = useState<string[]>(() =>
    readArrayFilter(
      columnFilters,
      'sender',
      availableSenders.map((item) => item.value)
    )
  )
  const [amountRange, setAmountRange] = useState<IncomeAmountFilterValue>(() =>
    readAmountFilter(columnFilters)
  )

  useEffect(() => {
    setDateRange(readDateFilter(columnFilters))
    setSelectedStatuses(
      readArrayFilter(
        columnFilters,
        'status',
        availableStatuses.map((status) => status.value)
      )
    )
    setSelectedAccounts(
      readArrayFilter(
        columnFilters,
        'account',
        availableAccounts.map((item) => item.value)
      )
    )
    setSelectedCategories(
      readArrayFilter(
        columnFilters,
        'category',
        availableCategories.map((item) => item.value)
      )
    )
    setSelectedSenders(
      readArrayFilter(
        columnFilters,
        'sender',
        availableSenders.map((item) => item.value)
      )
    )
    setAmountRange(readAmountFilter(columnFilters))
  }, [
    availableAccounts,
    availableCategories,
    availableSenders,
    availableStatuses,
    columnFilters
  ])

  const orderedStatuses = useMemo(
    () => availableStatuses,
    [
      availableStatuses
    ]
  )

  const handleApply = () => {
    const nextFilters = columnFilters.filter(
      (filter) =>
        filter.id !== 'expectedDate' &&
        filter.id !== 'status' &&
        filter.id !== 'amount' &&
        filter.id !== 'account' &&
        filter.id !== 'category' &&
        filter.id !== 'sender'
    )

    const normalizedDateRange: IncomeDateFilterValue | undefined =
      dateRange?.from || dateRange?.to
        ? {
            from: dateRange?.from
              ? startOfDay(dateRange.from).toISOString()
              : undefined,
            to: dateRange?.to ? endOfDay(dateRange.to).toISOString() : undefined
          }
        : undefined

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

    if (
      selectedStatuses.length > 0 &&
      selectedStatuses.length < availableStatuses.length
    ) {
      nextFilters.push({
        id: 'status',
        value: selectedStatuses
      })
    }

    if (
      selectedAccounts.length > 0 &&
      selectedAccounts.length < availableAccounts.length
    ) {
      nextFilters.push({
        id: 'account',
        value: selectedAccounts
      })
    }

    if (
      selectedCategories.length > 0 &&
      selectedCategories.length < availableCategories.length
    ) {
      nextFilters.push({
        id: 'category',
        value: selectedCategories
      })
    }

    if (
      selectedSenders.length > 0 &&
      selectedSenders.length < availableSenders.length
    ) {
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
    onApply(
      columnFilters.filter(
        (filter) =>
          filter.id !== 'expectedDate' &&
          filter.id !== 'status' &&
          filter.id !== 'amount' &&
          filter.id !== 'account' &&
          filter.id !== 'category' &&
          filter.id !== 'sender'
      )
    )
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
            {orderedStatuses.map((status) => (
              <Checkbox
                key={status.value}
                id={`income-filter-status-${status.value}`}
                checked={selectedStatuses.includes(status.value)}
                onCheckedChange={(checked) => {
                  setSelectedStatuses((current) =>
                    toggleValue(current, status.value, checked)
                  )
                }}
                label={status.label}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="type-label text-gray-600">{t('common.amount')}</p>
          <div className="flex flex-col gap-2">
            <label
              className="type-label text-gray-600"
              htmlFor={minAmountInputId}
            >
              {t('common.from')}
            </label>
            <InputShell>
              <span className="type-label shrink-0 text-gray-500">
                {t('common.currencyCode')}
              </span>
              <input
                id={minAmountInputId}
                type="number"
                inputMode="decimal"
                min={0}
                value={amountRange.min ?? ''}
                onChange={(event) => {
                  const nextValue = event.target.value
                  setAmountRange((current) => ({
                    ...current,
                    min: nextValue === '' ? undefined : Number(nextValue)
                  }))
                }}
                className={inputInnerClassName}
              />
            </InputShell>
            <label
              className="type-label text-gray-600"
              htmlFor={maxAmountInputId}
            >
              {t('common.to')}
            </label>
            <InputShell>
              <span className="type-label shrink-0 text-gray-500">
                {t('common.currencyCode')}
              </span>
              <input
                id={maxAmountInputId}
                type="number"
                inputMode="decimal"
                min={0}
                value={amountRange.max ?? ''}
                onChange={(event) => {
                  const nextValue = event.target.value
                  setAmountRange((current) => ({
                    ...current,
                    max: nextValue === '' ? undefined : Number(nextValue)
                  }))
                }}
                className={inputInnerClassName}
              />
            </InputShell>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="type-label text-gray-600">{t('common.account')}</p>
          <div className="flex flex-col gap-3">
            {availableAccounts.map((account) => (
              <Checkbox
                key={account.value}
                id={`income-filter-account-${account.value}`}
                checked={selectedAccounts.includes(account.value)}
                onCheckedChange={(checked) => {
                  setSelectedAccounts((current) =>
                    toggleValue(current, account.value, checked)
                  )
                }}
                label={account.label}
              />
            ))}
          </div>
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

      <div className="flex shrink-0 flex-row flex-wrap justify-end gap-2 border-t border-gray-300 pt-4">
        <Button
          type="button"
          variant="outlined"
          color="primary"
          label={t('common.clearAllFilters')}
          icon={
            <Undo2Icon
              className="size-4 stroke-[1.5]"
              aria-hidden={true}
            />
          }
          onClick={handleReset}
        />
        <Button
          type="button"
          variant="filled"
          color="primary"
          label={t('transactions.applyFilters')}
          icon={
            <CheckIcon
              className="size-4 stroke-[1.5]"
              aria-hidden={true}
            />
          }
          onClick={handleApply}
        />
      </div>
    </div>
  )
}
