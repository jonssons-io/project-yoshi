import { useQuery } from '@tanstack/react-query'
import {
	getCategoryOptions,
	listCategoriesOptions
} from '@/api/generated/@tanstack/react-query.gen'
import type {
	GetCategoryData,
	ListCategoriesData
} from '@/api/generated/types.gen'

type ListCategoriesQuery = NonNullable<ListCategoriesData['query']>

/**
 * Hook to fetch list of categories for a household
 * Query is auto-disabled when householdId or userId is undefined/null
 */
export function useCategoriesList(params: {
	householdId?: ListCategoriesData['path']['householdId'] | null
	userId?: string | null
	budgetId?: ListCategoriesQuery['budgetId'] | null
	type?: ListCategoriesQuery['type']
	enabled?: boolean
}) {
	const { householdId, budgetId, type, enabled = true } = params
	return useQuery({
		...listCategoriesOptions({
			path: { householdId: householdId ?? '' },
			query: {
				budgetId: budgetId ?? undefined,
				type
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
	categoryId?: GetCategoryData['path']['categoryId'] | null
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
