import { useQuery } from '@tanstack/react-query'
import { listTransfersOptions } from '@/api/generated/@tanstack/react-query.gen'
import type { ListTransfersData } from '@/api/generated/types.gen'

/**
 * Hook to fetch list of transfers for a budget
 * Query is auto-disabled when budgetId or userId is undefined/null
 */
export function useTransfersList(params: {
	budgetId?: ListTransfersData['path']['budgetId'] | null
	userId?: string | null
	dateFrom?: Date
	dateTo?: Date
	enabled?: boolean
}) {
	const { budgetId, dateFrom, dateTo, enabled = true } = params
	return useQuery({
		...listTransfersOptions({
			path: { budgetId: budgetId ?? '' },
			query: {
				dateFrom: dateFrom?.toISOString(),
				dateTo: dateTo?.toISOString()
			}
		}),
		enabled: enabled && !!budgetId,
		select: (response) => response.data ?? []
	})
}
