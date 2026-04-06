import type { ColumnFiltersState } from '@tanstack/react-table'
import { endOfDay, startOfDay } from 'date-fns'
import type { DateRange } from 'react-day-picker'

export type DateRangeFilterValue = {
  from?: string
  to?: string
}

export type AmountRangeFilterValue = {
  min?: number
  max?: number
}

export function readArrayFilter<T extends string>(
  columnFilters: ColumnFiltersState,
  columnId: string,
  fallback: T[] = []
): T[] {
  const match = columnFilters.find((filter) => filter.id === columnId)?.value
  if (!Array.isArray(match)) return fallback
  return match as T[]
}

export function readDateRangeFilter(
  columnFilters: ColumnFiltersState,
  columnId: string
): DateRange | undefined {
  const match = columnFilters.find((filter) => filter.id === columnId)?.value as
    | DateRangeFilterValue
    | undefined
  if (!match?.from && !match?.to) return undefined
  return {
    from: match?.from ? new Date(match.from) : undefined,
    to: match?.to ? new Date(match.to) : undefined
  }
}

export function readAmountRangeFilter<T extends AmountRangeFilterValue>(
  columnFilters: ColumnFiltersState,
  columnId: string
): T {
  const match = columnFilters.find((filter) => filter.id === columnId)?.value
  if (!match || typeof match !== 'object') return {} as T
  return match as T
}

export function toggleFilterValue<T extends string>(
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

export function stripDrawerFilters(
  columnFilters: ColumnFiltersState,
  filterIds: readonly string[]
): ColumnFiltersState {
  return columnFilters.filter((filter) => !filterIds.includes(filter.id))
}

export function normalizeDateRange(
  dateRange: DateRange | undefined
): DateRangeFilterValue | undefined {
  if (!dateRange?.from && !dateRange?.to) return undefined
  return {
    from: dateRange?.from
      ? startOfDay(dateRange.from).toISOString()
      : undefined,
    to: dateRange?.to ? endOfDay(dateRange.to).toISOString() : undefined
  }
}
