import { createQueryHook } from './create-query-hook'

/**
 * Hook to fetch list of bills for a budget
 * Query is auto-disabled when budgetId or userId is undefined/null
 */
export const useBillsList = createQueryHook(
	'bills',
	'list',
	(params: {
		budgetId?: string | null
		userId?: string | null
		includeArchived?: boolean
		thisMonthOnly?: boolean
		enabled?: boolean
	}) => ({
		budgetId: params.budgetId ?? '',
		userId: params.userId ?? '',
		includeArchived: params.includeArchived,
		thisMonthOnly: params.thisMonthOnly
	}),
	(params) => [params.budgetId, params.userId]
)

/**
 * Hook to fetch a single bill by ID
 * Query is auto-disabled when billId is undefined/null
 */
export const useBillById = createQueryHook(
	'bills',
	'getById',
	(params: { billId?: string | null; enabled?: boolean }) => ({
		id: params.billId ?? ''
	}),
	(params) => [params.billId]
)
