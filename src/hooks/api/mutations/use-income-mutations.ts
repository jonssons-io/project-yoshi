import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
	archiveIncomeMutation,
	createIncomeMutation,
	deleteIncomeMutation,
	updateIncomeMutation
} from '@/api/generated/@tanstack/react-query.gen'
import type {
	ArchiveIncomeResponse,
	ArchiveIncomeRequest,
	CreateIncomeRequest,
	CreateIncomeResponse,
	DeleteIncomeResponse,
	UpdateIncomeRequest,
	UpdateIncomeResponse
} from '@/api/generated/types.gen'
import { invalidateByOperation } from '../invalidate-by-operation'
import type { MutationCallbacks } from '../types'

type IncomeCreateVariables = {
	householdId: string
	userId?: string | null
} & CreateIncomeRequest
type IncomeUpdateVariables = {
	id: string
	userId?: string | null
} & UpdateIncomeRequest
type IncomeDeleteVariables = { id: string; userId?: string | null }
type IncomeArchiveVariables = {
	id: string
	isArchived: ArchiveIncomeRequest['isArchived']
	userId?: string | null
}

/**
 * Hook to create a new income
 */
export function useCreateIncome(
	callbacks?: MutationCallbacks<
		CreateIncomeResponse,
		IncomeCreateVariables
	>
) {
	const queryClient = useQueryClient()
	const mutationOptions = createIncomeMutation()
	return useMutation<CreateIncomeResponse, Error, IncomeCreateVariables>({
		mutationFn: async (variables: IncomeCreateVariables) => {
			const { householdId, userId: _userId, ...body } = variables
			const mutationFn = mutationOptions.mutationFn
			if (!mutationFn) throw new Error('Missing createIncome mutation function')
			return mutationFn({
				path: { householdId },
				body
			}, {} as never)
		},
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listIncomes')
			invalidateByOperation(queryClient, 'listCategories')
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}

/**
 * Hook to update an existing income
 */
export function useUpdateIncome(
	callbacks?: MutationCallbacks<
		UpdateIncomeResponse,
		IncomeUpdateVariables
	>
) {
	const queryClient = useQueryClient()
	const mutationOptions = updateIncomeMutation()
	return useMutation<UpdateIncomeResponse, Error, IncomeUpdateVariables>({
		mutationFn: async (variables: IncomeUpdateVariables) => {
			const { id, userId: _userId, ...body } = variables
			const mutationFn = mutationOptions.mutationFn
			if (!mutationFn) throw new Error('Missing updateIncome mutation function')
			return mutationFn({
				path: { incomeId: id },
				body
			}, {} as never)
		},
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listIncomes')
			invalidateByOperation(queryClient, 'listCategories')
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}

/**
 * Hook to delete an income
 */
export function useDeleteIncome(
	callbacks?: MutationCallbacks<DeleteIncomeResponse, IncomeDeleteVariables>
) {
	const queryClient = useQueryClient()
	const mutationOptions = deleteIncomeMutation()
	return useMutation<DeleteIncomeResponse, Error, IncomeDeleteVariables>({
		mutationFn: async (variables: IncomeDeleteVariables) =>
			(() => {
				const mutationFn = mutationOptions.mutationFn
				if (!mutationFn) throw new Error('Missing deleteIncome mutation function')
				return mutationFn({
					path: { incomeId: variables.id }
				}, {} as never)
			})(),
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listIncomes')
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}

/**
 * Hook to archive/unarchive an income
 */
export function useArchiveIncome(
	callbacks?: MutationCallbacks<
		ArchiveIncomeResponse,
		IncomeArchiveVariables
	>
) {
	const queryClient = useQueryClient()
	const mutationOptions = archiveIncomeMutation()
	return useMutation<ArchiveIncomeResponse, Error, IncomeArchiveVariables>({
		mutationFn: async (variables: IncomeArchiveVariables) =>
			(() => {
				const mutationFn = mutationOptions.mutationFn
				if (!mutationFn) throw new Error('Missing archiveIncome mutation function')
				return mutationFn({
					path: { incomeId: variables.id },
					body: { isArchived: variables.isArchived }
				}, {} as never)
			})(),
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listIncomes')
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}
