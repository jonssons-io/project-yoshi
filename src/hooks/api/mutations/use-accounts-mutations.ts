import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
	createAccountMutation,
	deleteAccountMutation,
	getAccountBalanceQueryKey,
	getAccountQueryKey,
	toggleAccountArchiveMutation,
	updateAccountMutation
} from '@/api/generated/@tanstack/react-query.gen'
import type {
	CreateAccountResponse,
	DeleteAccountResponse,
	ToggleAccountArchiveResponse,
	UpdateAccountResponse
} from '@/api/generated/types.gen'
import { invalidateByOperation } from '../invalidate-by-operation'
import type { MutationCallbacks } from '../types'

type CreateAccountVariables = {
	householdId: string
	name: string
	externalIdentifier?: string
	initialBalance?: number
	userId?: string | null
}

type UpdateAccountVariables = {
	id: string
	userId?: string | null
	name?: string
	externalIdentifier?: string
	initialBalance?: number
	isArchived?: boolean
}

type DeleteAccountVariables = { id: string; userId?: string | null }
type ToggleAccountArchiveVariables = {
	id: string
	isArchived: boolean
	userId?: string | null
}

/**
 * Hook to create a new account
 */
export function useCreateAccount(
	callbacks?: MutationCallbacks<
		CreateAccountResponse,
		CreateAccountVariables
	>
) {
	const queryClient = useQueryClient()
	const mutationOptions = createAccountMutation()
	return useMutation<CreateAccountResponse, Error, CreateAccountVariables>({
		mutationFn: async (variables: CreateAccountVariables) =>
			(mutationOptions.mutationFn as NonNullable<typeof mutationOptions.mutationFn>)({
				path: { householdId: variables.householdId },
				body: {
					name: variables.name,
					externalIdentifier: variables.externalIdentifier ?? undefined,
					initialBalance: variables.initialBalance
				}
			}, {} as never),
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listAccounts')
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}

/**
 * Hook to update an existing account
 */
export function useUpdateAccount(
	callbacks?: MutationCallbacks<
		UpdateAccountResponse,
		UpdateAccountVariables
	>
) {
	const queryClient = useQueryClient()
	const mutationOptions = updateAccountMutation()
	return useMutation<UpdateAccountResponse, Error, UpdateAccountVariables>({
		mutationFn: async (variables: UpdateAccountVariables) =>
			(mutationOptions.mutationFn as NonNullable<typeof mutationOptions.mutationFn>)({
				path: { accountId: variables.id },
				body: {
					name: variables.name,
					externalIdentifier: variables.externalIdentifier ?? undefined,
					initialBalance: variables.initialBalance
				}
			}, {} as never),
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listAccounts')
			queryClient.invalidateQueries({
				queryKey: getAccountQueryKey({ path: { accountId: variables.id } })
			})
			queryClient.invalidateQueries({
				queryKey: getAccountBalanceQueryKey({ path: { accountId: variables.id } })
			})
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}

/**
 * Hook to delete an account
 * Note: Accounts cannot be deleted if transactions or bills reference them (Restrict policy)
 */
export function useDeleteAccount(
	callbacks?: MutationCallbacks<DeleteAccountResponse, DeleteAccountVariables>
) {
	const queryClient = useQueryClient()
	const mutationOptions = deleteAccountMutation()
	return useMutation<DeleteAccountResponse, Error, DeleteAccountVariables>({
		mutationFn: async (variables: DeleteAccountVariables) =>
			(mutationOptions.mutationFn as NonNullable<typeof mutationOptions.mutationFn>)({
				path: { accountId: variables.id }
			}, {} as never),
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listAccounts')
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}

/**
 * Hook to toggle account archive status
 */
export function useToggleAccountArchive(
	callbacks?: MutationCallbacks<
		ToggleAccountArchiveResponse,
		ToggleAccountArchiveVariables
	>
) {
	const queryClient = useQueryClient()
	const mutationOptions = toggleAccountArchiveMutation()
	return useMutation<
		ToggleAccountArchiveResponse,
		Error,
		ToggleAccountArchiveVariables
	>({
		mutationFn: async (variables: ToggleAccountArchiveVariables) =>
			(mutationOptions.mutationFn as NonNullable<typeof mutationOptions.mutationFn>)({
				path: { accountId: variables.id },
				body: { isArchived: variables.isArchived }
			}, {} as never),
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listAccounts')
			queryClient.invalidateQueries({
				queryKey: getAccountQueryKey({ path: { accountId: variables.id } })
			})
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}
