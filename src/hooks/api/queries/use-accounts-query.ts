import { useQuery } from '@tanstack/react-query'
import {
	getAccountBalanceOptions,
	getAccountOptions,
	listAccountsOptions
} from '@/api/generated/@tanstack/react-query.gen'
import type {
	GetAccountBalanceData,
	GetAccountData,
	ListAccountsData
} from '@/api/generated/types.gen'

type ListAccountsQuery = NonNullable<ListAccountsData['query']>

/**
 * Hook to fetch list of accounts for a household
 * Query is auto-disabled when householdId or userId is undefined/null
 */
export function useAccountsList(params: {
	householdId?: ListAccountsData['path']['householdId'] | null
	userId?: string | null
	budgetId?: ListAccountsQuery['budgetId'] | null
	enabled?: boolean
	excludeArchived?: ListAccountsQuery['excludeArchived']
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
	accountId?: GetAccountData['path']['accountId'] | null
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
	accountId?: GetAccountBalanceData['path']['accountId'] | null
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
