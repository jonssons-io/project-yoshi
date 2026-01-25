import { createQueryHook } from './create-query-hook'

/**
 * Hook to fetch list of incomes for a budget
 */
export const useIncomeList = createQueryHook(
	'income',
	'list',
	(params: {
		budgetId?: string | null
		userId?: string | null
		includeArchived?: boolean
		enabled?: boolean
	}) => ({
		budgetId: params.budgetId ?? '',
		userId: params.userId ?? '',
		includeArchived: params.includeArchived ?? false
	}),
	(params) => [params.budgetId, params.userId, params.includeArchived]
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
