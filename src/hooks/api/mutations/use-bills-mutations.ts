import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
	archiveBillMutation,
	createBillMutation,
	deleteBillMutation,
	getBillInstanceQueryKey,
	updateBillMutation
} from '@/api/generated/@tanstack/react-query.gen'
import type {
	ArchiveBillResponse,
	CreateBillResponse,
	UpdateBillResponse
} from '@/api/generated/types.gen'
import { invalidateByOperation } from '../invalidate-by-operation'
import type { MutationCallbacks } from '../types'

type BillCreateVariables = { budgetId: string; userId?: string | null } & Record<
	string,
	unknown
>
type BillUpdateVariables = { id: string; userId?: string | null } & Record<
	string,
	unknown
>
type BillDeleteVariables = { id: string; userId?: string | null }
type BillArchiveVariables = {
	id: string
	archived: boolean
	userId?: string | null
}

/**
 * Hook to create a new bill
 */
export function useCreateBill(
	callbacks?: MutationCallbacks<
		CreateBillResponse,
		BillCreateVariables
	>
) {
	const queryClient = useQueryClient()
	const mutationOptions = createBillMutation()
	return useMutation<CreateBillResponse, Error, BillCreateVariables>({
		mutationFn: async (variables: BillCreateVariables) => {
			const { budgetId, userId: _userId, ...body } = variables
			return (mutationOptions.mutationFn as NonNullable<typeof mutationOptions.mutationFn>)({
				path: { budgetId },
				body: body as never
			}, {} as never)
		},
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listBills')
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}

/**
 * Hook to update an existing bill
 */
export function useUpdateBill(
	callbacks?: MutationCallbacks<
		UpdateBillResponse,
		BillUpdateVariables
	>
) {
	const queryClient = useQueryClient()
	const mutationOptions = updateBillMutation()
	return useMutation<UpdateBillResponse, Error, BillUpdateVariables>({
		mutationFn: async (variables: BillUpdateVariables) => {
			const { id, userId: _userId, ...body } = variables
			return (mutationOptions.mutationFn as NonNullable<typeof mutationOptions.mutationFn>)({
				path: { billId: id },
				body: body as never
			}, {} as never)
		},
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listBills')
			queryClient.invalidateQueries({
				queryKey: getBillInstanceQueryKey({
					path: { instanceId: variables.id }
				})
			})
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}

/**
 * Hook to delete a bill
 */
export function useDeleteBill(
	callbacks?: MutationCallbacks<unknown, BillDeleteVariables>
) {
	const queryClient = useQueryClient()
	const mutationOptions = deleteBillMutation()
	return useMutation<unknown, Error, BillDeleteVariables>({
		mutationFn: async (variables: BillDeleteVariables) =>
			(mutationOptions.mutationFn as NonNullable<typeof mutationOptions.mutationFn>)({
				path: { billId: variables.id }
			}, {} as never),
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listBills')
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}

/**
 * Hook to archive or unarchive a bill
 */
export function useArchiveBill(
	callbacks?: MutationCallbacks<
		ArchiveBillResponse,
		BillArchiveVariables
	>
) {
	const queryClient = useQueryClient()
	const mutationOptions = archiveBillMutation()
	return useMutation<ArchiveBillResponse, Error, BillArchiveVariables>({
		mutationFn: async (variables: BillArchiveVariables) =>
			(mutationOptions.mutationFn as NonNullable<typeof mutationOptions.mutationFn>)({
				path: { billId: variables.id },
				body: { archived: variables.archived }
			}, {} as never),
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listBills')
			queryClient.invalidateQueries({
				queryKey: getBillInstanceQueryKey({
					path: { instanceId: variables.id }
				})
			})
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}
