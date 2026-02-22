import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	createAllocationMutation,
	getUnallocatedFundsOptions,
	transferAllocationMutation
} from '@/api/generated/@tanstack/react-query.gen'
import type {
	CreateAllocationResponse,
	TransferAllocationResponse
} from '@/api/generated/types.gen'
import { invalidateByOperation } from './invalidate-by-operation'
import type { MutationCallbacks } from './types'

type CreateAllocationVariables = {
	budgetId: string
	amount: number
	userId?: string | null
	categoryId?: string
}

type TransferAllocationVariables = {
	fromBudgetId: string
	toBudgetId: string
	amount: number
	userId?: string | null
}

export function useAllocationsQuery(params: {
	householdId: string
	userId: string
	enabled?: boolean
}) {
	const { householdId, enabled = true } = params
	return useQuery({
		...getUnallocatedFundsOptions({
			path: { householdId }
		}),
		enabled: enabled && !!householdId
	})
}

export function useCreateAllocationMutation(
	callbacks?: MutationCallbacks<
		CreateAllocationResponse,
		CreateAllocationVariables
	>
) {
	const queryClient = useQueryClient()
	const mutationOptions = createAllocationMutation()
	return useMutation<CreateAllocationResponse, Error, CreateAllocationVariables>({
		mutationFn: async (variables: CreateAllocationVariables) =>
			(mutationOptions.mutationFn as NonNullable<typeof mutationOptions.mutationFn>)({
				path: { budgetId: variables.budgetId },
				body: {
					amount: variables.amount
				}
			}, {} as never),
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listBudgets')
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}

export function useTransferAllocationMutation(
	callbacks?: MutationCallbacks<
		TransferAllocationResponse,
		TransferAllocationVariables
	>
) {
	const queryClient = useQueryClient()
	const mutationOptions = transferAllocationMutation()
	return useMutation<TransferAllocationResponse, Error, TransferAllocationVariables>({
		mutationFn: async (variables: TransferAllocationVariables) =>
			(mutationOptions.mutationFn as NonNullable<typeof mutationOptions.mutationFn>)({
				body: {
					fromBudgetId: variables.fromBudgetId,
					toBudgetId: variables.toBudgetId,
					amount: variables.amount
				}
			}, {} as never),
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listBudgets')
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}
