import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
	createRecipientMutation,
	deleteRecipientMutation,
	getOrCreateRecipientMutation,
	getRecipientQueryKey,
	updateRecipientMutation
} from '@/api/generated/@tanstack/react-query.gen'
import type {
	CreateRecipientRequest,
	CreateRecipientResponse,
	GetOrCreateRecipientResponse,
	UpdateRecipientRequest,
	UpdateRecipientResponse
} from '@/api/generated/types.gen'
import { invalidateByOperation } from '../invalidate-by-operation'
import type { MutationCallbacks } from '../types'

type CreateRecipientVariables = {
	householdId: string
	userId?: string | null
} & CreateRecipientRequest
type UpdateRecipientVariables = {
	id: string
	userId?: string | null
} & UpdateRecipientRequest
type DeleteRecipientVariables = { id: string; userId?: string | null }

/**
 * Hook to create a new recipient
 */
export function useCreateRecipient(
	callbacks?: MutationCallbacks<
		CreateRecipientResponse,
		CreateRecipientVariables
	>
) {
	const queryClient = useQueryClient()
	const mutationOptions = createRecipientMutation()
	return useMutation<CreateRecipientResponse, Error, CreateRecipientVariables>({
		mutationFn: async (variables: CreateRecipientVariables) => {
			const { householdId, userId: _userId, ...body } = variables
			const mutationFn = mutationOptions.mutationFn
			if (!mutationFn) throw new Error('Missing createRecipient mutation function')
			return mutationFn({
				path: { householdId },
				body
			}, {} as never)
		},
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listRecipients')
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}

/**
 * Hook to get or create a recipient by name
 * Creates a new recipient if one with the same name doesn't exist
 */
export function useGetOrCreateRecipient(
	callbacks?: MutationCallbacks<
		GetOrCreateRecipientResponse,
		CreateRecipientVariables
	>
) {
	const queryClient = useQueryClient()
	const mutationOptions = getOrCreateRecipientMutation()
	return useMutation<GetOrCreateRecipientResponse, Error, CreateRecipientVariables>({
		mutationFn: async (variables: CreateRecipientVariables) => {
			const { householdId, userId: _userId, ...body } = variables
			const mutationFn = mutationOptions.mutationFn
			if (!mutationFn)
				throw new Error('Missing getOrCreateRecipient mutation function')
			return mutationFn({
				path: { householdId },
				body
			}, {} as never)
		},
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listRecipients')
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}

/**
 * Hook to update an existing recipient
 */
export function useUpdateRecipient(
	callbacks?: MutationCallbacks<
		UpdateRecipientResponse,
		UpdateRecipientVariables
	>
) {
	const queryClient = useQueryClient()
	const mutationOptions = updateRecipientMutation()
	return useMutation<UpdateRecipientResponse, Error, UpdateRecipientVariables>({
		mutationFn: async (variables: UpdateRecipientVariables) => {
			const { id, userId: _userId, ...body } = variables
			const mutationFn = mutationOptions.mutationFn
			if (!mutationFn) throw new Error('Missing updateRecipient mutation function')
			return mutationFn({
				path: { recipientId: id },
				body
			}, {} as never)
		},
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listRecipients')
			queryClient.invalidateQueries({
				queryKey: getRecipientQueryKey({
					path: { recipientId: variables.id }
				})
			})
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}

/**
 * Hook to delete a recipient
 * Note: Transactions referencing this recipient will have their recipientId set to null (SetNull policy)
 */
export function useDeleteRecipient(
	callbacks?: MutationCallbacks<unknown, DeleteRecipientVariables>
) {
	const queryClient = useQueryClient()
	const mutationOptions = deleteRecipientMutation()
	return useMutation<unknown, Error, DeleteRecipientVariables>({
		mutationFn: async (variables: DeleteRecipientVariables) => {
			const mutationFn = mutationOptions.mutationFn
			if (!mutationFn) throw new Error('Missing deleteRecipient mutation function')
			return mutationFn({
				path: { recipientId: variables.id }
			}, {} as never)
		},
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listRecipients')
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}
