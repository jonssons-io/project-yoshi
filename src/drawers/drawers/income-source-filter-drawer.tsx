import type { ColumnFiltersState } from '@tanstack/react-table'
import { endOfDay, startOfDay } from 'date-fns'
import { CheckIcon, Undo2Icon } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { useTranslation } from 'react-i18next'

import type { RecurrenceType } from '@/api/generated/types.gen'
import { Button } from '@/components/button/button'
import { Checkbox } from '@/components/checkbox/checkbox'
import { DateRangePicker } from '@/components/date-range-picker/date-range-picker'
import { FilterMultiselect } from '@/components/filter-multiselect/filter-multiselect'
import {
  InputShell,
  inputInnerClassName
} from '@/components/input-shell/input-shell'

type SelectOption = { value: string; label: string }

export type IncomeSourceDateFilterValue = {
  from?: string
  to?: string
}

export type IncomeSourceAmountFilterValue = {
  min?: number
  max?: number
}

export type IncomeSourceFilterDrawerProps = {
  columnFilters: ColumnFiltersState
  onApply: (filters: ColumnFiltersState) => void
  availableRecurrences: Array<{ value: RecurrenceType; label: string }>
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
  const match = columnFilters.find((filter) => filter.id === 'period')
    ?.value as IncomeSourceDateFilterValue | undefined
  if (!match?.from && !match?.to) return undefined
  return {
    from: match?.from ? new Date(match.from) : undefined,
    to: match?.to ? new Date(match.to) : undefined
  }
}

function readAmountFilter(
  columnFilters: ColumnFiltersState
): IncomeSourceAmountFilterValue {
  const match = columnFilters.find((filter) => filter.id === 'amount')?.value
  if (!match || typeof match !== 'object') return {}
  return match as IncomeSourceAmountFilterValue
}

function toggleValue<T extends string>(
  current: T[],
  nextValue: T,
  checked: boolean
): T[] {
  if (checked) {
    return current.includes(nextValue) ? current : [...current, nextValue]
  }
  return current.filter((value) => value !== nextValue)
}

export function IncomeSourceFilterDrawer({
  columnFilters,
  onApply,
  availableRecurrences,
  availableAccounts,
  availableCategories,
  availableSenders,
  onClose
}: IncomeSourceFilterDrawerProps) {
  const { t } = useTranslation()
  const idPrefix = useId()
  const minAmountInputId = `${idPrefix}-income-source-filter-min-amount`
  const maxAmountInputId = `${idPrefix}-income-source-filter-max-amount`

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() =>
    readDateFilter(columnFilters)
  )
  const [selectedRecurrences, setSelectedRecurrences] = useState<
    RecurrenceType[]
  >(() =>
    readArrayFilter(
      columnFilters,
      'recurrence',
      availableRecurrences.map((r) => r.value)
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
  const [amountRange, setAmountRange] =
    useState<IncomeSourceAmountFilterValue>(() =>
      readAmountFilter(columnFilters)
    )

  useEffect(() => {
    setDateRange(readDateFilter(columnFilters))
    setSelectedRecurrences(
      readArrayFilter(
        columnFilters,
        'recurrence',
        availableRecurrences.map((r) => r.value)
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
    availableRecurrences,
    columnFilters
  ])

  const orderedRecurrences = useMemo(
    () => availableRecurrences,
    [availableRecurrences]
  )

  const handleApply = () => {
    const nextFilters = columnFilters.filter(
      (filter) =>
        filter.id !== 'period' &&
        filter.id !== 'recurrence' &&
        filter.id !== 'amount' &&
        filter.id !== 'account' &&
        filter.id !== 'category' &&
        filter.id !== 'sender'
    )

    const normalizedDateRange: IncomeSourceDateFilterValue | undefined =
      dateRange?.from || dateRange?.to
        ? {
            from: dateRange?.from
              ? startOfDay(dateRange.from).toISOString()
              : undefined,
            to: dateRange?.to ? endOfDay(dateRange.to).toISOString() : undefined
          }
        : undefined

    const normalizedAmountRange: IncomeSourceAmountFilterValue = {
      min: amountRange.min,
      max: amountRange.max
    }

    if (normalizedDateRange) {
      nextFilters.push({ id: 'period', value: normalizedDateRange })
    }

    if (
      selectedRecurrences.length > 0 &&
      selectedRecurrences.length < availableRecurrences.length
    ) {
      nextFilters.push({ id: 'recurrence', value: selectedRecurrences })
    }

    if (
      selectedAccounts.length > 0 &&
      selectedAccounts.length < availableAccounts.length
    ) {
      nextFilters.push({ id: 'account', value: selectedAccounts })
    }

    if (
      selectedCategories.length > 0 &&
      selectedCategories.length < availableCategories.length
    ) {
      nextFilters.push({ id: 'category', value: selectedCategories })
    }

    if (
      selectedSenders.length > 0 &&
      selectedSenders.length < availableSenders.length
    ) {
      nextFilters.push({ id: 'sender', value: selectedSenders })
    }

    if (
      normalizedAmountRange.min !== undefined ||
      normalizedAmountRange.max !== undefined
    ) {
      nextFilters.push({ id: 'amount', value: normalizedAmountRange })
    }

    onApply(nextFilters)
    onClose()
  }

  const handleReset = () => {
    onApply(
      columnFilters.filter(
        (filter) =>
          filter.id !== 'period' &&
          filter.id !== 'recurrence' &&
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
          <p className="type-label text-gray-600">{t('recurrence.label')}</p>
          <div className="flex flex-col gap-3">
            {orderedRecurrences.map((recurrence) => (
              <Checkbox
                key={recurrence.value}
                id={`income-source-filter-recurrence-${recurrence.value}`}
                checked={selectedRecurrences.includes(recurrence.value)}
                onCheckedChange={(checked) => {
                  setSelectedRecurrences((current) =>
                    toggleValue(current, recurrence.value, checked)
                  )
                }}
                label={recurrence.label}
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
                id={`income-source-filter-account-${account.value}`}
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
