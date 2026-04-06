import { useNavigate, useSearch } from '@tanstack/react-router'
import { endOfDay, format, parseISO, startOfDay } from 'date-fns'
import { useCallback, useMemo } from 'react'
import type { DateRangeValue } from '@/components/date-range-picker/date-range-picker'

/**
 * Reads the global `from` / `to` date range from the authenticated layout's
 * URL search params and exposes a setter that navigates (preserving other params).
 *
 * `from` / `to` are YYYY-MM-DD strings (the URL representation).
 * `dateFrom` / `dateTo` are local-time Date objects (start-of-day / end-of-day)
 * suitable for passing to API query hooks (which call `.toISOString()`).
 */
export function useDateRange() {
  const { from, to } = useSearch({
    from: '/_authenticated'
  })
  const navigate = useNavigate()

  const dateFrom = useMemo(
    () => startOfDay(parseISO(from)),
    [
      from
    ]
  )
  const dateTo = useMemo(
    () => endOfDay(parseISO(to)),
    [
      to
    ]
  )

  /** Update the global date range from Date objects (e.g. from DateRangePicker). */
  const setDateRange = useCallback(
    (range: DateRangeValue) => {
      void navigate({
        to: '.',
        search: (prev) => ({
          ...prev,
          from: format(range.from, 'yyyy-MM-dd'),
          to: format(range.to, 'yyyy-MM-dd')
        })
      })
    },
    [
      navigate
    ]
  )

  return {
    from,
    to,
    dateFrom,
    dateTo,
    setDateRange
  } as const
}
