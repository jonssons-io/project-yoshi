import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
	addHouseholdMemberMutation,
	deleteHouseholdMutation,
	getHouseholdMembersQueryKey,
	getHouseholdQueryKey,
	updateHouseholdMutation,
	createHouseholdMutation,
	removeHouseholdMemberMutation,
} from '@/api/generated/@tanstack/react-query.gen'
import type {
	CreateHouseholdResponse,
	DeleteHouseholdData,
	UpdateHouseholdResponse
} from '@/api/generated/types.gen'
import { invalidateByOperation } from '../invalidate-by-operation'
import type { MutationCallbacks } from '../types'

type CreateHouseholdVariables = { name: string; userId?: string | null }
type UpdateHouseholdVariables = { id: string; name: string; userId?: string | null }
type DeleteHouseholdVariables = { id: string; userId?: string | null }
type HouseholdMemberVariables = { householdId: string; userId: string }
type RemoveHouseholdUserVariables = {
	householdId: string
	userId: string
	removeUserId: string
}

/**
 * Hook to create a new household
 */
export function useCreateHousehold(
	callbacks?: MutationCallbacks<
		CreateHouseholdResponse,
		CreateHouseholdVariables
	>
) {
	const queryClient = useQueryClient()
	const mutationOptions = createHouseholdMutation()
	return useMutation<CreateHouseholdResponse, Error, CreateHouseholdVariables>({
		mutationFn: async (variables: CreateHouseholdVariables) =>
			(mutationOptions.mutationFn as NonNullable<typeof mutationOptions.mutationFn>)({
				body: { name: variables.name }
			}, {} as never),
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listHouseholds')
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}

/**
 * Hook to update an existing household
 */
export function useUpdateHousehold(
	callbacks?: MutationCallbacks<
		UpdateHouseholdResponse,
		UpdateHouseholdVariables
	>
) {
	const queryClient = useQueryClient()
	const mutationOptions = updateHouseholdMutation()
	return useMutation<UpdateHouseholdResponse, Error, UpdateHouseholdVariables>({
		mutationFn: async (variables: UpdateHouseholdVariables) =>
			(mutationOptions.mutationFn as NonNullable<typeof mutationOptions.mutationFn>)({
				path: { householdId: variables.id },
				body: { name: variables.name }
			}, {} as never),
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listHouseholds')
			queryClient.invalidateQueries({
				queryKey: getHouseholdQueryKey({
					path: { householdId: variables.id }
				})
			})
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}

/**
 * Hook to delete a household
 * Invalidates ALL related queries since a household contains budgets, categories,
 * accounts, and all child data (transactions, bills)
 */
export function useDeleteHousehold(
	callbacks?: MutationCallbacks<unknown, DeleteHouseholdVariables>
) {
	const queryClient = useQueryClient()
	const mutationOptions = deleteHouseholdMutation()
	return useMutation<unknown, Error, DeleteHouseholdVariables>({
		mutationFn: async (variables: DeleteHouseholdVariables) =>
			(mutationOptions.mutationFn as NonNullable<typeof mutationOptions.mutationFn>)({
				path: { householdId: variables.id }
			} as DeleteHouseholdData, {} as never),
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listHouseholds')
			invalidateByOperation(queryClient, 'listBudgets')
			invalidateByOperation(queryClient, 'listCategories')
			invalidateByOperation(queryClient, 'listAccounts')
			invalidateByOperation(queryClient, 'listTransactions')
			invalidateByOperation(queryClient, 'listBills')
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}

/**
 * Hook to add a user to a household
 */
export function useAddHouseholdUser(
	callbacks?: MutationCallbacks<
		unknown,
		HouseholdMemberVariables
	>
) {
	const queryClient = useQueryClient()
	const mutationOptions = addHouseholdMemberMutation()
	return useMutation<unknown, Error, HouseholdMemberVariables>({
		mutationFn: async (variables: HouseholdMemberVariables) =>
			(mutationOptions.mutationFn as NonNullable<typeof mutationOptions.mutationFn>)({
				path: {
					householdId: variables.householdId,
					userId: variables.userId
				}
			}, {} as never),
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listHouseholds')
			queryClient.invalidateQueries({
				queryKey: getHouseholdMembersQueryKey({
					path: { householdId: variables.householdId }
				})
			})
			queryClient.invalidateQueries({
				queryKey: getHouseholdQueryKey({
					path: { householdId: variables.householdId }
				})
			})
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}

/**
 * Hook to remove a user from a household
 */
export function useRemoveHouseholdUser(
	callbacks?: MutationCallbacks<
		unknown,
		RemoveHouseholdUserVariables
	>
) {
	const queryClient = useQueryClient()
	const mutationOptions = removeHouseholdMemberMutation()
	return useMutation<unknown, Error, RemoveHouseholdUserVariables>({
		mutationFn: async (variables: RemoveHouseholdUserVariables) =>
			(mutationOptions.mutationFn as NonNullable<typeof mutationOptions.mutationFn>)({
				path: {
					householdId: variables.householdId,
					userId: variables.removeUserId
				}
			}, {} as never),
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listHouseholds')
			queryClient.invalidateQueries({
				queryKey: getHouseholdMembersQueryKey({
					path: { householdId: variables.householdId }
				})
			})
			queryClient.invalidateQueries({
				queryKey: getHouseholdQueryKey({
					path: { householdId: variables.householdId }
				})
			})
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}
