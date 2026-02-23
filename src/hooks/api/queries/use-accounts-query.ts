import { useQuery } from '@tanstack/react-query'
import {
	getAccountBalanceOptions,
	getMultiAccountBalanceHistoryOptions,
	getAccountOptions,
	listAccountBalancesOptions,
	listAccountsOptions
} from '@/api/generated/@tanstack/react-query.gen'
import type {
	GetAccountBalanceData,
	GetMultiAccountBalanceHistoryData,
	GetAccountData,
	ListAccountBalancesData,
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

/**
 * Hook to fetch current balances for many accounts in one request.
 */
export function useAccountBalancesList(params: {
	householdId?: ListAccountBalancesData['path']['householdId'] | null
	userId?: string | null
	accountIds?: string[]
	includeArchived?: ListAccountBalancesData['query'] extends infer T
		? T extends { includeArchived?: infer I }
			? I
			: never
		: never
	enabled?: boolean
}) {
	const {
		householdId,
		accountIds,
		includeArchived,
		enabled = true
	} = params

	return useQuery({
		...listAccountBalancesOptions({
			path: { householdId: householdId ?? '' },
			query: {
				accountIds: accountIds && accountIds.length > 0 ? accountIds : undefined,
				includeArchived
			}
		}),
		enabled: enabled && !!householdId,
		retry: false,
		staleTime: 60_000,
		refetchOnMount: false,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		select: (response) => response.data ?? []
	})
}

/**
 * Hook to fetch balance history snapshots for multiple accounts.
 */
export function useMultiAccountBalanceHistory(params: {
	accountIds?: GetMultiAccountBalanceHistoryData['query']['accountIds']
	userId?: string | null
	dateFrom?: Date
	dateTo?: Date
	enabled?: boolean
}) {
	const { accountIds, dateFrom, dateTo, enabled = true } = params

	return useQuery({
		...getMultiAccountBalanceHistoryOptions({
			query: {
				accountIds: accountIds ?? [],
				dateFrom: dateFrom ? dateFrom.toISOString().slice(0, 10) : undefined,
				dateTo: dateTo ? dateTo.toISOString().slice(0, 10) : undefined
			}
		}),
		enabled: enabled && !!accountIds && accountIds.length > 0,
		retry: false,
		staleTime: 60_000,
		refetchOnMount: false,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		select: (response) => response.data ?? []
	})
}
