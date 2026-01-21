import { createQueryHook } from './create-query-hook'

/**
 * Hook to fetch list of categories for a household
 * Query is auto-disabled when householdId or userId is undefined/null
 */
export const useCategoriesList = createQueryHook(
	'categories',
	'list',
	(params: {
		householdId?: string | null
		userId?: string | null
		budgetId?: string | null
		type?: 'INCOME' | 'EXPENSE'
		enabled?: boolean
	}) => ({
		householdId: params.householdId ?? '',
		userId: params.userId ?? '',
		budgetId: params.budgetId || undefined,
		type: params.type
	}),
	(params) => [params.householdId, params.userId]
)

/**
 * Hook to fetch a single category by ID
 * Query is auto-disabled when categoryId or userId is undefined/null
 */
export const useCategoryById = createQueryHook(
	'categories',
	'getById',
	(params: {
		categoryId?: string | null
		userId?: string | null
		enabled?: boolean
	}) => ({
		id: params.categoryId ?? '',
		userId: params.userId ?? ''
	}),
	(params) => [params.categoryId, params.userId]
)
