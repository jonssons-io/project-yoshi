import {
  differenceInDays,
  differenceInMonths,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfDay,
  endOfMonth,
  format,
  startOfMonth
} from 'date-fns'

export type ChartDataPoint = {
  date: string
  originalDate: Date
  [key: string]: string | number | Date | undefined // accountId: balance
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
    // 3 months back from now
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

  // Fallback
  return {
    startDate: startOfMonth(now),
    endDate: endOfMonth(now)
  }
}

export function generateChartData(
  accounts: Array<{
    id: string
    initialBalance: number
  }>,
  allTransactions: Array<{
    accountId: string
    amount: number
    date: Date | string
    category?: {
      types: string[]
    }
  }>,
  startDate: Date,
  endDate: Date
): ChartDataPoint[] {
  // Sort transactions by date ASCENDING (oldest first)
  const sortedTxs = [
    ...allTransactions
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Initialize balances map with initialBalance
  const balances = new Map<string, number>()
  accounts.forEach((acc) => {
    balances.set(acc.id, Number(acc.initialBalance))
  })

  // 1. Advance state up to startDate (exclusive of range start?)
  // We want the starting point of the chart to reflect the balance at that time.
  // Effectively, calculate balance at `startDate`.

  const startMark = startDate
  let txIndex = 0

  while (txIndex < sortedTxs.length) {
    const tx = sortedTxs[txIndex]
    const txDate = new Date(tx.date)

    // Process all transactions BEFORE the start date
    if (txDate < startMark) {
      const accId = tx.accountId
      if (balances.has(accId)) {
        const current = Number(balances.get(accId) ?? 0)
        const amount = Number(tx.amount)

        // Determine direction based on category types
        // If hybrid, use heuristic (positive/negative amount in DB? No, DB stores positive usually)
        // We assume if EXPENSE is present, it's negative, unless INCOME is present and it's solely INCOME.
        // Wait, multi-type means it CAN be either. But a specific transaction implies one direction.
        // Since we don't have transaction-level type, we rely on the same heuristic:
        // If it has EXPENSE, treat as expense (negative), unless INCOME is exclusive.
        // Better: check if types includes INCOME. If ONLY INCOME, then + else -.
        // Or check amount sign? If amount is always positive, we need direction.
        // Let's use: includes('INCOME') and NOT includes('EXPENSE') -> +
        // includes('EXPENSE') -> -
        // distinct Income vs Expense?
        // If both, default to - (Expense) as per conservative budgeting.

        const isIncome =
          tx.category?.types?.includes('INCOME') &&
          !tx.category?.types?.includes('EXPENSE')
        const change = isIncome ? amount : -amount
        balances.set(accId, current + change)
      }
      txIndex++
    } else {
      break
    }
  }

  // Determine granularity and intervals
  const diffMonths = differenceInMonths(endDate, startDate)
  const diffDays = differenceInDays(endDate, startDate)

  let intervals: Date[]
  let formatStr: string

  if (diffMonths >= 3) {
    intervals = eachMonthOfInterval({
      start: startDate,
      end: endDate
    })
    formatStr = 'MMM yyyy'
  } else if (diffDays > 31) {
    intervals = eachWeekOfInterval({
      start: startDate,
      end: endDate
    })
    formatStr = 'MMM d'
  } else {
    intervals = eachDayOfInterval({
      start: startDate,
      end: endDate
    })
    formatStr = 'MMM d'
  }

  const dataPoints: ChartDataPoint[] = []

  // 2. Iterate intervals and capture snapshots
  // We will capture the balance at the End-Of-Day of each interval date?
  // Or if it's weekly/monthly, end of that period?
  // `eachMonth` gives 1st of month. We probably want the status at that point.
  // Let's settle on: value at the specified date (end of day).

  for (const date of intervals) {
    const cutoff = endOfDay(date)

    // Process transactions up to this cutoff
    while (txIndex < sortedTxs.length) {
      const tx = sortedTxs[txIndex]
      const txDate = new Date(tx.date)

      if (txDate <= cutoff) {
        const accId = tx.accountId
        if (balances.has(accId)) {
          const current = Number(balances.get(accId) ?? 0)
          const amount = Number(tx.amount)
          const isIncome =
            tx.category?.types?.includes('INCOME') &&
            !tx.category?.types?.includes('EXPENSE')
          const change = isIncome ? amount : -amount
          balances.set(accId, current + change)
        }
        txIndex++
      } else {
        break
      }
    }

    const point: ChartDataPoint = {
      date: format(date, formatStr),
      originalDate: date
    }

    accounts.forEach((acc) => {
      point[acc.id] = balances.get(acc.id) ?? 0
    })

    dataPoints.push(point)
  }

  return dataPoints
}

type AccountSnapshotHistory = {
  accountId: string
  snapshots: Array<{
    date: Date | string
    balance: number
  }>
}

function getChartIntervals(startDate: Date, endDate: Date) {
  const diffMonths = differenceInMonths(endDate, startDate)
  const diffDays = differenceInDays(endDate, startDate)

  if (diffMonths >= 3) {
    return {
      intervals: eachMonthOfInterval({
        start: startDate,
        end: endDate
      }),
      formatStr: 'MMM yyyy'
    }
  }

  if (diffDays > 31) {
    return {
      intervals: eachWeekOfInterval({
        start: startDate,
        end: endDate
      }),
      formatStr: 'MMM d'
    }
  }

  return {
    intervals: eachDayOfInterval({
      start: startDate,
      end: endDate
    }),
    formatStr: 'MMM d'
  }
}

/**
 * Builds chart points from account snapshot history.
 * For each chart interval, uses the latest snapshot on or before that date.
 */
export function generateChartDataFromSnapshots(
  accounts: Array<{
    id: string
    initialBalance: number
  }>,
  history: AccountSnapshotHistory[],
  currentBalances: Map<string, number>,
  startDate: Date,
  endDate: Date
): ChartDataPoint[] {
  const { formatStr } = getChartIntervals(startDate, endDate)
  const rangeStart = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate()
  )
  const rangeEnd = new Date(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate(),
    23,
    59,
    59,
    999
  )
  const today = new Date()
  const todayDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  )
  const todayKey = format(todayDate, 'yyyy-MM-dd')

  const pointsByDate = new Map<string, ChartDataPoint>()

  const getOrCreatePoint = (dateKey: string) => {
    const existing = pointsByDate.get(dateKey)
    if (existing) return existing

    const pointDate = new Date(`${dateKey}T00:00:00`)
    const created: ChartDataPoint = {
      date: format(pointDate, formatStr),
      originalDate: pointDate
    }
    pointsByDate.set(dateKey, created)
    return created
  }

  for (const item of history) {
    for (const snapshot of item.snapshots) {
      const snapshotDate =
        snapshot.date instanceof Date
          ? new Date(
              snapshot.date.getFullYear(),
              snapshot.date.getMonth(),
              snapshot.date.getDate()
            )
          : new Date(`${snapshot.date}T00:00:00`)
      if (snapshotDate < rangeStart || snapshotDate > rangeEnd) continue
      const dateKey =
        snapshot.date instanceof Date
          ? format(snapshotDate, 'yyyy-MM-dd')
          : snapshot.date
      const point = getOrCreatePoint(dateKey)
      point[item.accountId] = Number(snapshot.balance)
    }
  }

  // Current balance is the authoritative value for "today".
  if (todayDate >= rangeStart && todayDate <= rangeEnd) {
    const todayPoint = getOrCreatePoint(todayKey)
    for (const account of accounts) {
      todayPoint[account.id] = Number(
        currentBalances.get(account.id) ?? account.initialBalance
      )
    }
  }

  return [
    ...pointsByDate.values()
  ].sort((a, b) => a.originalDate.getTime() - b.originalDate.getTime())
}
