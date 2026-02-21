import { useQuery } from '@tanstack/react-query'
import {
	getBudgetOptions,
	listBudgetsOptions
} from '@/api/generated/@tanstack/react-query.gen'

/**
 * Hook to fetch list of budgets for a household
 * Query is auto-disabled when householdId or userId is undefined/null
 */
export function useBudgetsList(params: {
	householdId?: string | null
	userId?: string | null
	enabled?: boolean
}) {
	const { householdId, enabled = true } = params
	return useQuery({
		...listBudgetsOptions({
			path: { householdId: householdId ?? '' }
		}),
		enabled: enabled && !!householdId,
		select: (response) => response.data ?? []
	})
}

/**
 * Hook to fetch a single budget by ID
 * Query is auto-disabled when budgetId or userId is undefined/null
 */
export function useBudgetById(params: {
	budgetId?: string | null
	userId?: string | null
	enabled?: boolean
}) {
	const { budgetId, enabled = true } = params
	return useQuery({
		...getBudgetOptions({
			path: { budgetId: budgetId ?? '' }
		}),
		enabled: enabled && !!budgetId
	})
}
