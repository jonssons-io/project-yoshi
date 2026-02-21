import { useQuery } from '@tanstack/react-query'
import { getBillInstanceOptions, listBillsOptions } from '@/api/generated/@tanstack/react-query.gen'

/**
 * Hook to fetch list of bills for a budget
 * Query is auto-disabled when budgetId or userId is undefined/null
 */
export function useBillsList(params: {
	budgetId?: string | null
	userId?: string | null
	includeArchived?: boolean
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
export function useBillById(params: { billId?: string | null; enabled?: boolean }) {
	const { billId, enabled = true } = params
	return useQuery({
		...getBillInstanceOptions({
			path: { instanceId: billId ?? '' }
		}),
		enabled: enabled && !!billId
	})
}
