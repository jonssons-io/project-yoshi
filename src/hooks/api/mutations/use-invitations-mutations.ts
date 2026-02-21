import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
	acceptInvitationMutation,
	createInvitationMutation,
	declineInvitationMutation,
	listHouseholdInvitationsQueryKey,
	revokeInvitationMutation
} from '@/api/generated/@tanstack/react-query.gen'
import type {
	CreateInvitationResponse
} from '@/api/generated/types.gen'
import { invalidateByOperation } from '../invalidate-by-operation'
import type { MutationCallbacks } from '../types'

type CreateInvitationVariables = {
	householdId: string
	email: string
	userId?: string | null
}
type InvitationVariables = { invitationId: string; userId?: string | null }
type AcceptInvitationVariables = InvitationVariables & { householdId?: string }
type RevokeInvitationVariables = {
	invitationId: string
	householdId?: string
	userId?: string | null
}

export function useCreateInvitation(
	callbacks?: MutationCallbacks<
		CreateInvitationResponse,
		CreateInvitationVariables
	>
) {
	const queryClient = useQueryClient()
	const mutationOptions = createInvitationMutation()
	return useMutation<CreateInvitationResponse, Error, CreateInvitationVariables>({
		mutationFn: async (variables: CreateInvitationVariables) =>
			(mutationOptions.mutationFn as NonNullable<typeof mutationOptions.mutationFn>)({
				path: { householdId: variables.householdId },
				body: { email: variables.email }
			}, {} as never),
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({
				queryKey: listHouseholdInvitationsQueryKey({
					path: { householdId: variables.householdId }
				})
			})
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}

export function useAcceptInvitation(
	callbacks?: MutationCallbacks<
		{ householdId?: string },
		AcceptInvitationVariables
	>
) {
	const queryClient = useQueryClient()
	const mutationOptions = acceptInvitationMutation()
	return useMutation<{ householdId?: string }, Error, AcceptInvitationVariables>({
		mutationFn: async (variables: AcceptInvitationVariables) => {
			await (mutationOptions.mutationFn as NonNullable<typeof mutationOptions.mutationFn>)({
				path: { invitationId: variables.invitationId }
			}, {} as never)
			return { householdId: variables.householdId }
		},
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listMyInvitations')
			invalidateByOperation(queryClient, 'listHouseholds')
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}

export function useDeclineInvitation(
	callbacks?: MutationCallbacks<unknown, InvitationVariables>
) {
	const queryClient = useQueryClient()
	const mutationOptions = declineInvitationMutation()
	return useMutation<unknown, Error, InvitationVariables>({
		mutationFn: async (variables: InvitationVariables) =>
			(mutationOptions.mutationFn as NonNullable<typeof mutationOptions.mutationFn>)({
				path: { invitationId: variables.invitationId }
			}, {} as never),
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listMyInvitations')
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}

export function useRevokeInvitation(
	callbacks?: MutationCallbacks<
		unknown,
		RevokeInvitationVariables
	>
) {
	const queryClient = useQueryClient()
	const mutationOptions = revokeInvitationMutation()
	return useMutation<unknown, Error, RevokeInvitationVariables>({
		mutationFn: async (variables: RevokeInvitationVariables) =>
			(mutationOptions.mutationFn as NonNullable<typeof mutationOptions.mutationFn>)({
				path: { invitationId: variables.invitationId }
			}, {} as never),
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listMyInvitations')
			if (variables.householdId) {
				queryClient.invalidateQueries({
					queryKey: listHouseholdInvitationsQueryKey({
						path: { householdId: variables.householdId }
					})
				})
			}
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}
