import { useQuery } from '@tanstack/react-query'
import {
  getTransactionsSummaryOptions,
  getTransactionOptions,
  listTransactionsOptions
} from '@/api/generated/@tanstack/react-query.gen'
import type {
  GetTransactionsSummaryData,
  GetTransactionData,
  ListTransactionsData
} from '@/api/generated/types.gen'
import { fromApiDate } from '@/hooks/api/date-normalization'

type ListTransactionsQuery = NonNullable<ListTransactionsData['query']>
type GetTransactionsSummaryQuery = GetTransactionsSummaryData['query']

/**
 * Hook to fetch list of transactions for a household, optionally filtered by budget.
 * Query is auto-disabled when householdId is undefined/null.
 */
export function useTransactionsList(params: {
  householdId?: ListTransactionsQuery['householdId'] | null
  budgetId?: ListTransactionsQuery['budgetId'] | null
  userId?: string | null
  type?: ListTransactionsQuery['type']
  dateFrom?: Date
  dateTo?: Date
  enabled?: boolean
}) {
  const {
    householdId,
    budgetId,
    type,
    dateFrom,
    dateTo,
    enabled = true
  } = params
  return useQuery({
    ...listTransactionsOptions({
      query: {
        householdId: householdId ?? undefined,
        budgetId: budgetId ?? undefined,
        type,
        dateFrom: dateFrom?.toISOString(),
        dateTo: dateTo?.toISOString()
      }
    }),
    enabled: enabled && !!householdId,
    select: (response) =>
      (response.data ?? []).map((transaction) => ({
        ...transaction,
        date: fromApiDate(transaction.date)
      }))
  })
}

/**
 * Hook to fetch server-side transaction totals for a filtered timestamp range.
 */
export function useTransactionsSummary(params: {
  householdId?: GetTransactionsSummaryQuery['householdId'] | null
  budgetId?: GetTransactionsSummaryQuery['budgetId'] | null
  accountId?: GetTransactionsSummaryQuery['accountId'] | null
  categoryId?: GetTransactionsSummaryQuery['categoryId'] | null
  billInstanceId?: GetTransactionsSummaryQuery['billInstanceId'] | null
  type?: GetTransactionsSummaryQuery['type']
  dateFrom?: Date
  dateTo?: Date
  enabled?: boolean
}) {
  const {
    householdId,
    budgetId,
    accountId,
    categoryId,
    billInstanceId,
    type,
    dateFrom,
    dateTo,
    enabled = true
  } = params
  const dateFromIso = dateFrom?.toISOString()
  const dateToIso = dateTo?.toISOString()

  return useQuery({
    ...getTransactionsSummaryOptions({
      query: {
        householdId: householdId ?? undefined,
        budgetId: budgetId ?? undefined,
        accountId: accountId ?? undefined,
        categoryId: categoryId ?? undefined,
        billInstanceId: billInstanceId ?? undefined,
        type,
        dateFrom: dateFromIso ?? '',
        dateTo: dateToIso ?? ''
      }
    }),
    enabled: Boolean(
      enabled &&
        dateFromIso &&
        dateToIso &&
        (householdId || budgetId || accountId || categoryId || billInstanceId)
    )
  })
}

/**
 * Hook to fetch a single transaction by ID
 * Query is auto-disabled when transactionId or userId is undefined/null
 */
export function useTransactionById(params: {
  transactionId?: GetTransactionData['path']['transactionId'] | null
  userId?: string | null
  enabled?: boolean
}) {
  const { transactionId, enabled = true } = params
  return useQuery({
    ...getTransactionOptions({
      path: {
        transactionId: transactionId ?? ''
      }
    }),
    enabled: enabled && !!transactionId,
    select: (transaction) => ({
      ...transaction,
      date: fromApiDate(transaction.date)
    })
  })
}
