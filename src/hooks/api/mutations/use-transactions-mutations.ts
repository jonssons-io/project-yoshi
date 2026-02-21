import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
	cloneTransactionMutation,
	createTransactionMutation,
	deleteTransactionMutation,
	getTransactionQueryKey,
	updateTransactionMutation
} from '@/api/generated/@tanstack/react-query.gen'
import type {
	CloneTransactionResponse,
	CreateTransactionResponse,
	DeleteTransactionResponse,
	UpdateTransactionResponse
} from '@/api/generated/types.gen'
import { invalidateByOperation } from '../invalidate-by-operation'
import type { MutationCallbacks } from '../types'

type CreateTransactionVariables = Record<string, unknown>
type UpdateTransactionVariables = { id: string; userId?: string | null } & Record<
	string,
	unknown
>
type TransactionIdVariables = { id: string; userId?: string | null }

/**
 * Hook to create a new transaction
 */
export function useCreateTransaction(
	callbacks?: MutationCallbacks<CreateTransactionResponse, Record<string, unknown>>
) {
	const queryClient = useQueryClient()
	const mutationOptions = createTransactionMutation()
	return useMutation<CreateTransactionResponse, Error, CreateTransactionVariables>({
		mutationFn: async (variables: CreateTransactionVariables) =>
			(mutationOptions.mutationFn as NonNullable<typeof mutationOptions.mutationFn>)({
				body: variables as never
			}, {} as never),
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listTransactions')
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}

/**
 * Hook to update an existing transaction
 */
export function useUpdateTransaction(
	callbacks?: MutationCallbacks<
		UpdateTransactionResponse,
		UpdateTransactionVariables
	>
) {
	const queryClient = useQueryClient()
	const mutationOptions = updateTransactionMutation()
	return useMutation<UpdateTransactionResponse, Error, UpdateTransactionVariables>({
		mutationFn: async (variables: UpdateTransactionVariables) => {
			const { id, userId: _userId, ...body } = variables
			return (mutationOptions.mutationFn as NonNullable<typeof mutationOptions.mutationFn>)({
				path: { transactionId: id },
				body: body as never
			}, {} as never)
		},
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listTransactions')
			queryClient.invalidateQueries({
				queryKey: getTransactionQueryKey({
					path: { transactionId: variables.id }
				})
			})
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}

/**
 * Hook to delete a transaction
 */
export function useDeleteTransaction(
	callbacks?: MutationCallbacks<
		DeleteTransactionResponse,
		TransactionIdVariables
	>
) {
	const queryClient = useQueryClient()
	const mutationOptions = deleteTransactionMutation()
	return useMutation<DeleteTransactionResponse, Error, TransactionIdVariables>({
		mutationFn: async (variables: TransactionIdVariables) =>
			(mutationOptions.mutationFn as NonNullable<typeof mutationOptions.mutationFn>)({
				path: { transactionId: variables.id }
			}, {} as never),
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listTransactions')
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}

/**
 * Hook to clone a transaction
 */
export function useCloneTransaction(
	callbacks?: MutationCallbacks<
		CloneTransactionResponse,
		TransactionIdVariables
	>
) {
	const queryClient = useQueryClient()
	const mutationOptions = cloneTransactionMutation()
	return useMutation<CloneTransactionResponse, Error, TransactionIdVariables>({
		mutationFn: async (variables: TransactionIdVariables) =>
			(mutationOptions.mutationFn as NonNullable<typeof mutationOptions.mutationFn>)({
				path: { transactionId: variables.id },
				body: {}
			}, {} as never),
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listTransactions')
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}
