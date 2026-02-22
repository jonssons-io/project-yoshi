import { useQuery } from '@tanstack/react-query'
import { getBillInstanceOptions, listBillsOptions } from '@/api/generated/@tanstack/react-query.gen'
import type { GetBillInstanceData, ListBillsData } from '@/api/generated/types.gen'

type ListBillsQuery = NonNullable<ListBillsData['query']>

/**
 * Hook to fetch list of bills for a budget
 * Query is auto-disabled when budgetId or userId is undefined/null
 */
export function useBillsList(params: {
	budgetId?: ListBillsData['path']['budgetId'] | null
	userId?: string | null
	includeArchived?: ListBillsQuery['includeArchived']
	thisMonthOnly?: boolean
	enabled?: boolean
}) {
	const { budgetId, includeArchived, enabled = true } = params
	return useQuery({
		...listBillsOptions({
			path: { budgetId: budgetId ?? '' },
			query: {
				includeArchived
			}
		}),
		enabled: enabled && !!budgetId,
		select: (response) => response.data ?? []
	})
}

/**
 * Hook to fetch a single bill by ID
 * Query is auto-disabled when billId is undefined/null
 */
export function useBillById(params: {
	billId?: GetBillInstanceData['path']['instanceId'] | null
	enabled?: boolean
}) {
	const { billId, enabled = true } = params
	return useQuery({
		...getBillInstanceOptions({
			path: { instanceId: billId ?? '' }
		}),
		enabled: enabled && !!billId
	})
}
