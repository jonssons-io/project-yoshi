import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
	createCategoryMutation,
	deleteCategoryMutation,
	getCategoryQueryKey,
	updateCategoryMutation
} from '@/api/generated/@tanstack/react-query.gen'
import type {
	CreateCategoryResponse,
	DeleteCategoryResponse,
	UpdateCategoryResponse
} from '@/api/generated/types.gen'
import { invalidateByOperation } from '../invalidate-by-operation'
import type { MutationCallbacks } from '../types'

type CreateCategoryVariables = {
	householdId: string
	name: string
	types?: Array<'INCOME' | 'EXPENSE'>
	userId?: string | null
}
type UpdateCategoryVariables = {
	id: string
	name?: string
	types?: Array<'INCOME' | 'EXPENSE'>
	userId?: string | null
}
type DeleteCategoryVariables = { id: string; userId?: string | null }

/**
 * Hook to create a new category
 */
export function useCreateCategory(
	callbacks?: MutationCallbacks<
		CreateCategoryResponse,
		CreateCategoryVariables
	>
) {
	const queryClient = useQueryClient()
	const mutationOptions = createCategoryMutation()
	return useMutation<CreateCategoryResponse, Error, CreateCategoryVariables>({
		mutationFn: async (variables: CreateCategoryVariables) =>
			(mutationOptions.mutationFn as NonNullable<typeof mutationOptions.mutationFn>)({
				path: { householdId: variables.householdId },
				body: {
					name: variables.name,
					types: (variables.types ?? ['EXPENSE']) as never
				}
			}, {} as never),
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listCategories')
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}

/**
 * Hook to update an existing category
 */
export function useUpdateCategory(
	callbacks?: MutationCallbacks<
		UpdateCategoryResponse,
		UpdateCategoryVariables
	>
) {
	const queryClient = useQueryClient()
	const mutationOptions = updateCategoryMutation()
	return useMutation<UpdateCategoryResponse, Error, UpdateCategoryVariables>({
		mutationFn: async (variables: UpdateCategoryVariables) =>
			(mutationOptions.mutationFn as NonNullable<typeof mutationOptions.mutationFn>)({
				path: { categoryId: variables.id },
				body: {
					name: variables.name,
					types: variables.types as never
				}
			}, {} as never),
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listCategories')
			queryClient.invalidateQueries({
				queryKey: getCategoryQueryKey({ path: { categoryId: variables.id } })
			})
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}

/**
 * Hook to delete a category
 * Note: Categories cannot be deleted if transactions or bills reference them (Restrict policy)
 */
export function useDeleteCategory(
	callbacks?: MutationCallbacks<DeleteCategoryResponse, DeleteCategoryVariables>
) {
	const queryClient = useQueryClient()
	const mutationOptions = deleteCategoryMutation()
	return useMutation<DeleteCategoryResponse, Error, DeleteCategoryVariables>({
		mutationFn: async (variables: DeleteCategoryVariables) =>
			(mutationOptions.mutationFn as NonNullable<typeof mutationOptions.mutationFn>)({
				path: { categoryId: variables.id }
			}, {} as never),
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listCategories')
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}
