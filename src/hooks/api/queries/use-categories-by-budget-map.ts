import { useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'

import { listCategoriesOptions } from '@/api/generated/@tanstack/react-query.gen'
import type { Category } from '@/api/generated/types.gen'

/**
 * Fetches category lists scoped to each budget (API `budgetId` filter) and exposes a budgetId → categories map.
 * Used to show per-budget category membership and to derive each category’s linked budgets.
 */
export function useCategoriesByBudgetMap(params: {
  householdId?: string | null
  budgetIds: string[]
  enabled?: boolean
}) {
  const { householdId, budgetIds, enabled = true } = params

  const sortedIds = useMemo(
    () =>
      [
        ...new Set(budgetIds)
      ].sort(),
    [
      budgetIds
    ]
  )

  const queriesConfig = useMemo(
    () =>
      sortedIds.map((budgetId) => ({
        ...listCategoriesOptions({
          path: {
            householdId: householdId ?? ''
          },
          query: {
            budgetId
          }
        }),
        enabled: Boolean(enabled && householdId && sortedIds.length > 0)
      })),
    [
      sortedIds,
      householdId,
      enabled
    ]
  )

  return useQueries({
    queries: queriesConfig,
    combine: (results) => {
      const byBudgetId = new Map<string, Category[]>()
      let isLoading = false
      let isError = false
      for (let i = 0; i < sortedIds.length; i++) {
        const budgetId = sortedIds[i]
        if (budgetId === undefined) continue
        const r = results[i]
        if (!r) continue
        if (r.isLoading) isLoading = true
        if (r.isError) isError = true
        const payload = r.data
        const rows = Array.isArray(payload?.data)
          ? (payload.data as Category[])
          : []
        byBudgetId.set(budgetId, rows)
      }
      return {
        byBudgetId,
        isLoading,
        isError
      }
    }
  })
}
