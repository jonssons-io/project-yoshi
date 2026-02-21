import { useQuery } from '@tanstack/react-query'
import {
	getTransactionOptions,
	listTransactionsOptions
} from '@/api/generated/@tanstack/react-query.gen'
import type {
	GetTransactionData,
	ListTransactionsData
} from '@/api/generated/types.gen'

type ListTransactionsQuery = NonNullable<ListTransactionsData['query']>

/**
 * Hook to fetch list of transactions for a budget
 * Query is auto-disabled when budgetId or userId is undefined/null
 */
export function useTransactionsList(params: {
	budgetId?: ListTransactionsQuery['budgetId'] | null
	userId?: string | null
	type?: ListTransactionsQuery['type']
	dateFrom?: Date
	dateTo?: Date
	enabled?: boolean
}) {
	const { budgetId, type, dateFrom, dateTo, enabled = true } = params
	return useQuery({
		...listTransactionsOptions({
			query: {
				budgetId: budgetId ?? undefined,
				type,
				dateFrom: dateFrom?.toISOString(),
				dateTo: dateTo?.toISOString()
			}
		}),
		enabled: enabled && !!budgetId,
		select: (response) => response.data ?? []
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
			path: { transactionId: transactionId ?? '' }
		}),
		enabled: enabled && !!transactionId
	})
}
