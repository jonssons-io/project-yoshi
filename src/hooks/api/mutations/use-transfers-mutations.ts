import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
	createTransferMutation,
	deleteTransferMutation,
	updateTransferMutation
} from '@/api/generated/@tanstack/react-query.gen'
import type {
	CreateTransferRequest,
	CreateTransferResponse,
	DeleteTransferResponse,
	UpdateTransferRequest,
	UpdateTransferResponse
} from '@/api/generated/types.gen'
import { invalidateByOperation } from '../invalidate-by-operation'
import type { MutationCallbacks } from '../types'

type CreateTransferVariables = {
	budgetId: string
	userId?: string | null
} & CreateTransferRequest
type UpdateTransferVariables = {
	id: string
	userId?: string | null
} & UpdateTransferRequest
type DeleteTransferVariables = { id: string; userId?: string | null }

/**
 * Hook to create a new transfer between accounts
 */
export function useCreateTransfer(
	callbacks?: MutationCallbacks<
		CreateTransferResponse,
		CreateTransferVariables
	>
) {
	const queryClient = useQueryClient()
	const mutationOptions = createTransferMutation()
	return useMutation<CreateTransferResponse, Error, CreateTransferVariables>({
		mutationFn: async (variables: CreateTransferVariables) => {
			const { budgetId, userId: _userId, ...body } = variables
			const mutationFn = mutationOptions.mutationFn
			if (!mutationFn) throw new Error('Missing createTransfer mutation function')
			return mutationFn({
				path: { budgetId },
				body
			}, {} as never)
		},
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listTransfers')
			invalidateByOperation(queryClient, 'listAccounts')
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}

/**
 * Hook to update an existing transfer
 */
export function useUpdateTransfer(
	callbacks?: MutationCallbacks<
		UpdateTransferResponse,
		UpdateTransferVariables
	>
) {
	const queryClient = useQueryClient()
	const mutationOptions = updateTransferMutation()
	return useMutation<UpdateTransferResponse, Error, UpdateTransferVariables>({
		mutationFn: async (variables: UpdateTransferVariables) => {
			const { id, userId: _userId, ...body } = variables
			const mutationFn = mutationOptions.mutationFn
			if (!mutationFn) throw new Error('Missing updateTransfer mutation function')
			return mutationFn({
				path: { transferId: id },
				body
			}, {} as never)
		},
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listTransfers')
			invalidateByOperation(queryClient, 'listAccounts')
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}

/**
 * Hook to delete a transfer
 */
export function useDeleteTransfer(
	callbacks?: MutationCallbacks<
		DeleteTransferResponse,
		DeleteTransferVariables
	>
) {
	const queryClient = useQueryClient()
	const mutationOptions = deleteTransferMutation()
	return useMutation<DeleteTransferResponse, Error, DeleteTransferVariables>({
		mutationFn: async (variables: DeleteTransferVariables) =>
			(() => {
				const mutationFn = mutationOptions.mutationFn
				if (!mutationFn) throw new Error('Missing deleteTransfer mutation function')
				return mutationFn({
					path: { transferId: variables.id }
				}, {} as never)
			})(),
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listTransfers')
			invalidateByOperation(queryClient, 'listAccounts')
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}
