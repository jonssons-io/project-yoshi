import { endOfMonth, startOfMonth } from 'date-fns'

export type ChartDataPoint = {
  date: string
  originalDate: Date
  [key: string]: string | number | Date | undefined
}

export type DateRangeOption = 'current-month' | '3-months' | 'custom'

export function getDateRange(
  selection: DateRangeOption,
  customStart?: Date,
  customEnd?: Date
) {
  const now = new Date()

  if (selection === 'current-month') {
    return {
      startDate: startOfMonth(now),
      endDate: endOfMonth(now)
    }
  }

  if (selection === '3-months') {
    const start = startOfMonth(
      new Date(now.getFullYear(), now.getMonth() - 2, 1)
    )
    return {
      startDate: start,
      endDate: endOfMonth(now)
    }
  }

  if (selection === 'custom' && customStart && customEnd) {
    return {
      startDate: customStart,
      endDate: customEnd
    }
  }

  return {
    startDate: startOfMonth(now),
    endDate: endOfMonth(now)
  }
}
