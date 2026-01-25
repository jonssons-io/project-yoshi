import { createQueryHook } from './create-query-hook'

/**
 * Hook to fetch list of transfers for a budget
 * Query is auto-disabled when budgetId or userId is undefined/null
 */
export const useTransfersList = createQueryHook(
	'transfers',
	'list',
	(params: {
		budgetId?: string | null
		userId?: string | null
		dateFrom?: Date
		dateTo?: Date
		enabled?: boolean
	}) => ({
		budgetId: params.budgetId ?? '',
		userId: params.userId ?? '',
		dateFrom: params.dateFrom,
		dateTo: params.dateTo
	}),
	(params) => [params.budgetId, params.userId, params.dateFrom, params.dateTo]
)
