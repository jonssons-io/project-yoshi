import type { ColumnFiltersState } from '@tanstack/react-table'

export type AmountBounds = {
  min?: number
  max?: number
}

type DateRangeFilterValue = {
  from?: string
  to?: string
}

export function getAmountBounds<
  T extends {
    amount: number
  }
>(rows: T[]): AmountBounds {
  if (rows.length === 0) return {}

  let min = rows[0].amount
  let max = rows[0].amount

  for (let index = 1; index < rows.length; index += 1) {
    const amount = rows[index].amount
    if (amount < min) min = amount
    if (amount > max) max = amount
  }

  return {
    min,
    max
  }
}

export function readDateRangeFilter(
  filters: ColumnFiltersState,
  id: string
):
  | {
      from?: Date
      to?: Date
    }
  | undefined {
  const filter = filters.find((item) => item.id === id)
  if (!filter || typeof filter.value !== 'object' || !filter.value)
    return undefined

  const value = filter.value as DateRangeFilterValue
  return {
    from: value.from ? new Date(value.from) : undefined,
    to: value.to ? new Date(value.to) : undefined
  }
}

export function readSingleSelectFilter(
  filters: ColumnFiltersState,
  id: string
): string | undefined {
  const filter = filters.find((item) => item.id === id)
  if (!filter || !Array.isArray(filter.value) || filter.value.length !== 1) {
    return undefined
  }

  const [value] = filter.value
  return typeof value === 'string' ? value : undefined
}
