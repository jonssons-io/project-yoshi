import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'

import { getHouseholdPeriodSummaryOptions } from '@/api/generated/@tanstack/react-query.gen'

/**
 * Dashboard-style income / expense / net totals for an inclusive calendar date range.
 * Query params are `YYYY-MM-DD` (local calendar dates from the given `Date` values).
 */
export function useHouseholdPeriodSummary(params: {
  householdId?: string | null
  dateFrom?: Date
  dateTo?: Date
  enabled?: boolean
}) {
  const { householdId, dateFrom, dateTo, enabled = true } = params
  const dateFromStr = dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined
  const dateToStr = dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined

  return useQuery({
    ...getHouseholdPeriodSummaryOptions({
      path: {
        householdId: householdId ?? ''
      },
      query: {
        dateFrom: dateFromStr ?? '',
        dateTo: dateToStr ?? ''
      }
    }),
    enabled: Boolean(enabled && householdId && dateFromStr && dateToStr)
  })
}
