import { useQuery } from '@tanstack/react-query'
import {
	getTransactionOptions,
	listTransactionsOptions
} from '@/api/generated/@tanstack/react-query.gen'

/**
 * Hook to fetch list of transactions for a budget
 * Query is auto-disabled when budgetId or userId is undefined/null
 */
export function useTransactionsList(params: {
	budgetId?: string | null
	userId?: string | null
	type?: 'INCOME' | 'EXPENSE'
	dateFrom?: Date
	dateTo?: Date
	enabled?: boolean
}) {
	const { budgetId, type, dateFrom, dateTo, enabled = true } = params
	return useQuery({
		...listTransactionsOptions({
			query: {
				budgetId: budgetId ?? undefined,
				type: type as never,
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
	transactionId?: string | null
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
