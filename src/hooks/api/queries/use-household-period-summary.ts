import { useQuery } from '@tanstack/react-query'
import { getHouseholdPeriodSummaryOptions } from '@/api/generated/@tanstack/react-query.gen'

/**
 * Dashboard-style income / expense / net totals for an inclusive UTC timestamp range.
 */
export function useHouseholdPeriodSummary(params: {
  householdId?: string | null
  dateFrom?: Date
  dateTo?: Date
  enabled?: boolean
}) {
  const { householdId, dateFrom, dateTo, enabled = true } = params
  const dateFromIso = dateFrom?.toISOString()
  const dateToIso = dateTo?.toISOString()

  return useQuery({
    ...getHouseholdPeriodSummaryOptions({
      path: {
        householdId: householdId ?? ''
      },
      query: {
        dateFrom: dateFromIso ?? '',
        dateTo: dateToIso ?? ''
      }
    }),
    enabled: Boolean(enabled && householdId && dateFromIso && dateToIso)
  })
}
