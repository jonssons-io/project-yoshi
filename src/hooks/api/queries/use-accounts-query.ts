import { useQuery } from '@tanstack/react-query'
import {
	getAccountBalanceOptions,
	getAccountOptions,
	listAccountsOptions
} from '@/api/generated/@tanstack/react-query.gen'

/**
 * Hook to fetch list of accounts for a household
 * Query is auto-disabled when householdId or userId is undefined/null
 */
export function useAccountsList(params: {
	householdId?: string | null
	userId?: string | null
	budgetId?: string | null
	enabled?: boolean
	excludeArchived?: boolean
}) {
	const { householdId, budgetId, excludeArchived, enabled = true } = params
	return useQuery({
		...listAccountsOptions({
			path: { householdId: householdId ?? '' },
			query: {
				budgetId: budgetId ?? undefined,
				excludeArchived
			}
		}),
		enabled: enabled && !!householdId,
		select: (response) => response.data ?? []
	})
}

/**
 * Hook to fetch a single account by ID
 * Query is auto-disabled when accountId or userId is undefined/null
 */
export function useAccountById(params: {
	accountId?: string | null
	userId?: string | null
	enabled?: boolean
}) {
	const { accountId, enabled = true } = params
	return useQuery({
		...getAccountOptions({
			path: { accountId: accountId ?? '' }
		}),
		enabled: enabled && !!accountId
	})
}

/**
 * Hook to fetch account balance
 * Query is auto-disabled when accountId or userId is undefined/null
 */
export function useAccountBalance(params: {
	accountId?: string | null
	userId?: string | null
	enabled?: boolean
}) {
	const { accountId, enabled = true } = params
	return useQuery({
		...getAccountBalanceOptions({
			path: { accountId: accountId ?? '' }
		}),
		enabled: enabled && !!accountId
	})
}
