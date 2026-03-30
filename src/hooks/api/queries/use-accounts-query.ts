import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  getAccountBalanceOptions,
  getAccountOptions,
  getHouseholdAccountBalanceChartOptions,
  listAccountBalancesOptions,
  listAccountsOptions
} from '@/api/generated/@tanstack/react-query.gen'
import type {
  GetAccountBalanceData,
  GetAccountData,
  GetHouseholdAccountBalanceChartData,
  ListAccountBalancesData,
  ListAccountsData
} from '@/api/generated/types.gen'
import { fromApiDate } from '@/hooks/api/date-normalization'

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
      path: {
        householdId: householdId ?? ''
      },
      query: {
        budgetId: budgetId ?? undefined,
        excludeArchived
      }
    }),
    enabled: enabled && !!householdId,
    select: (response) =>
      (response.data ?? []).map((account) => ({
        ...account,
        createdAt: fromApiDate(account.createdAt)
      }))
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
      path: {
        accountId: accountId ?? ''
      }
    }),
    enabled: enabled && !!accountId,
    refetchOnMount: true,
    select: (account) => ({
      ...account,
      createdAt: fromApiDate(account.createdAt)
    })
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
      path: {
        accountId: accountId ?? ''
      }
    }),
    enabled: enabled && !!accountId,
    select: (accountBalance) => ({
      ...accountBalance,
      historyRecalcFrom: accountBalance.historyRecalcFrom
        ? fromApiDate(accountBalance.historyRecalcFrom)
        : undefined
    })
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
    ? T extends {
        includeArchived?: infer I
      }
      ? I
      : never
    : never
  enabled?: boolean
}) {
  const { householdId, accountIds, includeArchived, enabled = true } = params

  return useQuery({
    ...listAccountBalancesOptions({
      path: {
        householdId: householdId ?? ''
      },
      query: {
        accountIds:
          accountIds && accountIds.length > 0 ? accountIds : undefined,
        includeArchived
      }
    }),
    enabled: enabled && !!householdId,
    retry: false,
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    select: (response) =>
      (response.data ?? []).map((balance) => ({
        ...balance,
        historyRecalcFrom: balance.historyRecalcFrom
          ? fromApiDate(balance.historyRecalcFrom)
          : undefined
      }))
  })
}

/**
 * Hook to fetch the server-side forward-filled daily balance chart data.
 * Replaces client-side snapshot stitching with the dedicated chart endpoint
 * that returns a shared date axis and per-account series.
 */
export function useAccountBalanceChart(params: {
  householdId?: GetHouseholdAccountBalanceChartData['path']['householdId'] | null
  accountIds?: string[]
  dateFrom?: Date
  dateTo?: Date
  includeArchived?: boolean
  enabled?: boolean
}) {
  const { householdId, accountIds, dateFrom, dateTo, includeArchived, enabled = true } = params
  const dateFromStr = dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined
  const dateToStr = dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined

  return useQuery({
    ...getHouseholdAccountBalanceChartOptions({
      path: {
        householdId: householdId ?? ''
      },
      query: {
        dateFrom: dateFromStr ?? '',
        dateTo: dateToStr ?? '',
        accountIds: accountIds && accountIds.length > 0 ? accountIds : undefined,
        includeArchived
      }
    }),
    enabled: Boolean(enabled && householdId && dateFromStr && dateToStr),
    retry: false,
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  })
}
