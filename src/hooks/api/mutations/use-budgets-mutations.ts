import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
	createBudgetMutation,
	deleteBudgetMutation,
	getBudgetQueryKey,
	linkAccountToBudgetMutation,
	linkCategoryToBudgetMutation,
	unlinkAccountFromBudgetMutation,
	unlinkCategoryFromBudgetMutation,
	updateBudgetMutation
} from '@/api/generated/@tanstack/react-query.gen'
import type {
	CreateBudgetRequest,
	CreateBudgetResponse,
	DeleteBudgetResponse,
	UpdateBudgetRequest,
	UpdateBudgetResponse
} from '@/api/generated/types.gen'
import { invalidateByOperation } from '../invalidate-by-operation'
import type { MutationCallbacks } from '../types'

type CreateBudgetVariables = {
	householdId: string
	userId?: string | null
} & Omit<CreateBudgetRequest, 'startDate'> & { startDate: string | Date }

type UpdateBudgetVariables = {
	id: string
	userId?: string | null
} & Omit<UpdateBudgetRequest, 'startDate'> & { startDate?: string | Date }

type DeleteBudgetVariables = { id: string; userId?: string | null }
type BudgetCategoryVariables = {
	budgetId: string
	categoryId: string
	userId?: string | null
}
type BudgetAccountVariables = {
	budgetId: string
	accountId: string
	userId?: string | null
}

/**
 * Hook to create a new budget
 */
export function useCreateBudget(
	callbacks?: MutationCallbacks<
		CreateBudgetResponse,
		CreateBudgetVariables
	>
) {
	const queryClient = useQueryClient()
	const mutationOptions = createBudgetMutation()
	return useMutation<CreateBudgetResponse, Error, CreateBudgetVariables>({
		mutationFn: async (variables: CreateBudgetVariables) => {
			const { householdId, userId: _userId, startDate, ...rest } = variables
			const mutationFn = mutationOptions.mutationFn
			if (!mutationFn) throw new Error('Missing createBudget mutation function')
			return mutationFn({
				path: { householdId },
				body: {
					...rest,
					startDate:
						startDate instanceof Date ? startDate.toISOString() : startDate
				}
			}, {} as never)
		},
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listBudgets')
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}

/**
 * Hook to update an existing budget
 */
export function useUpdateBudget(
	callbacks?: MutationCallbacks<
		UpdateBudgetResponse,
		UpdateBudgetVariables
	>
) {
	const queryClient = useQueryClient()
	const mutationOptions = updateBudgetMutation()
	return useMutation<UpdateBudgetResponse, Error, UpdateBudgetVariables>({
		mutationFn: async (variables: UpdateBudgetVariables) => {
			const { id, userId: _userId, startDate, ...rest } = variables
			const mutationFn = mutationOptions.mutationFn
			if (!mutationFn) throw new Error('Missing updateBudget mutation function')
			return mutationFn({
				path: { budgetId: id },
				body: {
					...rest,
					startDate:
						startDate instanceof Date ? startDate.toISOString() : startDate
				}
			}, {} as never)
		},
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listBudgets')
			queryClient.invalidateQueries({
				queryKey: getBudgetQueryKey({ path: { budgetId: variables.id } })
			})
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}

/**
 * Hook to delete a budget
 * Invalidates budgets, transactions, and bills since they cascade on budget delete
 */
export function useDeleteBudget(
	callbacks?: MutationCallbacks<DeleteBudgetResponse, DeleteBudgetVariables>
) {
	const queryClient = useQueryClient()
	const mutationOptions = deleteBudgetMutation()
	return useMutation<DeleteBudgetResponse, Error, DeleteBudgetVariables>({
		mutationFn: async (variables: DeleteBudgetVariables) => {
			const mutationFn = mutationOptions.mutationFn
			if (!mutationFn) throw new Error('Missing deleteBudget mutation function')
			return mutationFn({
				path: { budgetId: variables.id }
			}, {} as never)
		},
		onSuccess: (data, variables) => {
			invalidateByOperation(queryClient, 'listBudgets')
			invalidateByOperation(queryClient, 'listTransactions')
			invalidateByOperation(queryClient, 'listBills')
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}

/**
 * Hook to link a category to a budget
 */
export function useLinkBudgetCategory(
	callbacks?: MutationCallbacks<
		unknown,
		BudgetCategoryVariables
	>
) {
	const queryClient = useQueryClient()
	const mutationOptions = linkCategoryToBudgetMutation()
	return useMutation<unknown, Error, BudgetCategoryVariables>({
		mutationFn: async (variables: BudgetCategoryVariables) => {
			const mutationFn = mutationOptions.mutationFn
			if (!mutationFn) throw new Error('Missing linkCategoryToBudget mutation function')
			return mutationFn({
				path: { budgetId: variables.budgetId, categoryId: variables.categoryId }
			}, {} as never)
		},
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({
				queryKey: getBudgetQueryKey({ path: { budgetId: variables.budgetId } })
			})
			invalidateByOperation(queryClient, 'listCategories')
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}

/**
 * Hook to unlink a category from a budget
 */
export function useUnlinkBudgetCategory(
	callbacks?: MutationCallbacks<
		unknown,
		BudgetCategoryVariables
	>
) {
	const queryClient = useQueryClient()
	const mutationOptions = unlinkCategoryFromBudgetMutation()
	return useMutation<unknown, Error, BudgetCategoryVariables>({
		mutationFn: async (variables: BudgetCategoryVariables) => {
			const mutationFn = mutationOptions.mutationFn
			if (!mutationFn)
				throw new Error('Missing unlinkCategoryFromBudget mutation function')
			return mutationFn({
				path: { budgetId: variables.budgetId, categoryId: variables.categoryId }
			}, {} as never)
		},
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({
				queryKey: getBudgetQueryKey({ path: { budgetId: variables.budgetId } })
			})
			invalidateByOperation(queryClient, 'listCategories')
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}

/**
 * Hook to link an account to a budget
 */
export function useLinkBudgetAccount(
	callbacks?: MutationCallbacks<
		unknown,
		BudgetAccountVariables
	>
) {
	const queryClient = useQueryClient()
	const mutationOptions = linkAccountToBudgetMutation()
	return useMutation<unknown, Error, BudgetAccountVariables>({
		mutationFn: async (variables: BudgetAccountVariables) => {
			const mutationFn = mutationOptions.mutationFn
			if (!mutationFn) throw new Error('Missing linkAccountToBudget mutation function')
			return mutationFn({
				path: { budgetId: variables.budgetId, accountId: variables.accountId }
			}, {} as never)
		},
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({
				queryKey: getBudgetQueryKey({ path: { budgetId: variables.budgetId } })
			})
			invalidateByOperation(queryClient, 'listAccounts')
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}

/**
 * Hook to unlink an account from a budget
 */
export function useUnlinkBudgetAccount(
	callbacks?: MutationCallbacks<
		unknown,
		BudgetAccountVariables
	>
) {
	const queryClient = useQueryClient()
	const mutationOptions = unlinkAccountFromBudgetMutation()
	return useMutation<unknown, Error, BudgetAccountVariables>({
		mutationFn: async (variables: BudgetAccountVariables) => {
			const mutationFn = mutationOptions.mutationFn
			if (!mutationFn)
				throw new Error('Missing unlinkAccountFromBudget mutation function')
			return mutationFn({
				path: { budgetId: variables.budgetId, accountId: variables.accountId }
			}, {} as never)
		},
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({
				queryKey: getBudgetQueryKey({ path: { budgetId: variables.budgetId } })
			})
			invalidateByOperation(queryClient, 'listAccounts')
			callbacks?.onSuccess?.(data, variables)
		},
		onError: (error, variables) => callbacks?.onError?.(error, variables)
	})
}
