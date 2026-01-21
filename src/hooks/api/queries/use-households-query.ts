import { createQueryHook } from './create-query-hook'

/**
 * Hook to fetch list of households for a user
 * Query is auto-disabled when userId is undefined/null
 */
export const useHouseholdsList = createQueryHook(
	'households',
	'list',
	(params: { userId?: string | null; enabled?: boolean }) => ({
		userId: params.userId ?? ''
	}),
	(params) => [params.userId]
)

/**
 * Hook to fetch a single household by ID
 * Query is auto-disabled when householdId or userId is undefined/null
 */
export const useHouseholdById = createQueryHook(
	'households',
	'getById',
	(params: {
		householdId?: string | null
		userId?: string | null
		enabled?: boolean
	}) => ({
		id: params.householdId ?? '',
		userId: params.userId ?? ''
	}),
	(params) => [params.householdId, params.userId]
)
