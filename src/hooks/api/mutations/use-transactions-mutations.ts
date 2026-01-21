import {
	createMutationHook,
	invalidateAll,
	invalidateQuery
} from './create-mutation-hook'

/**
 * Hook to create a new transaction
 */
export const useCreateTransaction = createMutationHook(
	'transactions',
	'create',
	() => [invalidateAll('transactions')]
)

/**
 * Hook to update an existing transaction
 */
export const useUpdateTransaction = createMutationHook(
	'transactions',
	'update',
	(variables) => [
		invalidateAll('transactions'),
		invalidateQuery('transactions', 'getById', {
			id: variables.id,
			userId: variables.userId
		})
	]
)

/**
 * Hook to delete a transaction
 */
export const useDeleteTransaction = createMutationHook(
	'transactions',
	'delete',
	() => [invalidateAll('transactions')]
)

/**
 * Hook to clone a transaction
 */
export const useCloneTransaction = createMutationHook(
	'transactions',
	'clone',
	() => [invalidateAll('transactions')]
)
