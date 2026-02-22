import { useQuery } from '@tanstack/react-query'
import { getIncomeOptions, listIncomesOptions } from '@/api/generated/@tanstack/react-query.gen'
import type { GetIncomeData, ListIncomesData } from '@/api/generated/types.gen'

type ListIncomesQuery = NonNullable<ListIncomesData['query']>

/**
 * Hook to fetch list of incomes for a budget
 */
export function useIncomeList(params: {
	householdId?: ListIncomesData['path']['householdId'] | null
	budgetId?: string | null
	userId?: string | null
	includeArchived?: ListIncomesQuery['includeArchived']
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
	id: GetIncomeData['path']['incomeId']
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
