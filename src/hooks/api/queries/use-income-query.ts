import { useQuery } from '@tanstack/react-query'
import { getIncomeOptions, listIncomesOptions } from '@/api/generated/@tanstack/react-query.gen'

/**
 * Hook to fetch list of incomes for a budget
 */
export function useIncomeList(params: {
	householdId?: string | null
	budgetId?: string | null
	userId?: string | null
	includeArchived?: boolean
	enabled?: boolean
}) {
	const { householdId, includeArchived, enabled = true } = params
	return useQuery({
		...listIncomesOptions({
			path: { householdId: householdId ?? '' },
			query: {
				includeArchived
			}
		}),
		enabled: enabled && !!householdId,
		select: (response) => response.data ?? []
	})
}

/**
 * Hook to fetch a single income by ID
 */
export function useIncomeById(params: {
	id: string
	userId?: string | null
	enabled?: boolean
}) {
	const { id, enabled = true } = params
	return useQuery({
		...getIncomeOptions({
			path: { incomeId: id }
		}),
		enabled: enabled && !!id
	})
}
