import { createQueryHook } from './create-query-hook'

/**
 * Hook to fetch list of incomes for a budget
 */
export const useIncomeList = createQueryHook(
	'income',
	'list',
	(params: {
		householdId?: string | null
		budgetId?: string | null
		userId?: string | null
		includeArchived?: boolean
		enabled?: boolean
	}) => ({
		householdId: params.householdId ?? '',
		userId: params.userId ?? '',
		includeArchived: params.includeArchived ?? false
	}),
	(params) => [
		params.householdId,
		params.budgetId,
		params.userId,
		params.includeArchived
	]
)

/**
 * Hook to fetch a single income by ID
 */
export const useIncomeById = createQueryHook(
	'income',
	'getById',
	(params: { id: string; userId?: string | null; enabled?: boolean }) => ({
		id: params.id,
		userId: params.userId ?? ''
	}),
	(params) => [params.id, params.userId]
)
