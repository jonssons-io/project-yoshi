import { createQueryHook } from './create-query-hook'

/**
 * Hook to fetch list of accounts for a household
 * Query is auto-disabled when householdId or userId is undefined/null
 */
export const useAccountsList = createQueryHook(
	'accounts',
	'list',
	(params: {
		householdId?: string | null
		userId?: string | null
		budgetId?: string | null
		enabled?: boolean
		excludeArchived?: boolean
	}) => ({
		householdId: params.householdId ?? '',
		userId: params.userId ?? '',
		budgetId: params.budgetId || undefined,
		excludeArchived: params.excludeArchived
	}),
	(params) => [params.householdId, params.userId]
)

/**
 * Hook to fetch a single account by ID
 * Query is auto-disabled when accountId or userId is undefined/null
 */
export const useAccountById = createQueryHook(
	'accounts',
	'getById',
	(params: {
		accountId?: string | null
		userId?: string | null
		enabled?: boolean
	}) => ({
		id: params.accountId ?? '',
		userId: params.userId ?? ''
	}),
	(params) => [params.accountId, params.userId]
)

/**
 * Hook to fetch account balance
 * Query is auto-disabled when accountId or userId is undefined/null
 */
export const useAccountBalance = createQueryHook(
	'accounts',
	'getBalance',
	(params: {
		accountId?: string | null
		userId?: string | null
		enabled?: boolean
	}) => ({
		id: params.accountId ?? '',
		userId: params.userId ?? ''
	}),
	(params) => [params.accountId, params.userId]
)
