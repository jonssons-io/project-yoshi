/**
 * Hook to get and set the currently selected budget
 * through API-backed user settings.
 */

import { useQuery } from '@tanstack/react-query'
import { listBudgetsOptions } from '@/api/generated/@tanstack/react-query.gen'
import { useSetDefaultBudget } from '@/hooks/api'

export function useSelectedBudget(
  userId?: string | null,
  householdId?: string | null,
  enabled = true
) {
  const {
    data,
    isLoading: isBudgetsLoading,
    isFetching: isBudgetsFetching
  } = useQuery({
    ...listBudgetsOptions({
      path: {
        householdId: householdId ?? ''
      }
    }),
    enabled: enabled && !!householdId && !!userId,
    retry: false,
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    select: (response) => ({
      budgets: response.data ?? [],
      defaultBudgetId: response.defaultBudgetId ?? null
    })
  })

  const budgets = data?.budgets
  const apiDefaultBudgetId = data?.defaultBudgetId ?? null

  const fallbackBudgetId =
    !apiDefaultBudgetId && budgets && budgets.length > 0
      ? (budgets[0]?.id ?? null)
      : null

  const selectedBudgetId = apiDefaultBudgetId ?? fallbackBudgetId

  const { mutate: setDefaultBudget } = useSetDefaultBudget()

  const setSelectedBudget = (id: string | null) => {
    if (!id || !householdId || !userId) return
    setDefaultBudget({
      householdId,
      budgetId: id,
      userId
    })
  }

  const isLoading = isBudgetsLoading || isBudgetsFetching

  return {
    selectedBudgetId,
    setSelectedBudget,
    isLoading
  }
}
