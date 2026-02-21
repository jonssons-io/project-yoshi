import { useQuery } from '@tanstack/react-query'
import {
	getCategoryOptions,
	listCategoriesOptions
} from '@/api/generated/@tanstack/react-query.gen'

/**
 * Hook to fetch list of categories for a household
 * Query is auto-disabled when householdId or userId is undefined/null
 */
export function useCategoriesList(params: {
	householdId?: string | null
	userId?: string | null
	budgetId?: string | null
	type?: 'INCOME' | 'EXPENSE'
	enabled?: boolean
}) {
	const { householdId, budgetId, type, enabled = true } = params
	return useQuery({
		...listCategoriesOptions({
			path: { householdId: householdId ?? '' },
			query: {
				budgetId: budgetId ?? undefined,
				type: type as never
			}
		}),
		enabled: enabled && !!householdId,
		select: (response) => response.data ?? []
	})
}

/**
 * Hook to fetch a single category by ID
 * Query is auto-disabled when categoryId or userId is undefined/null
 */
export function useCategoryById(params: {
	categoryId?: string | null
	userId?: string | null
	enabled?: boolean
}) {
	const { categoryId, enabled = true } = params
	return useQuery({
		...getCategoryOptions({
			path: { categoryId: categoryId ?? '' }
		}),
		enabled: enabled && !!categoryId
	})
}
