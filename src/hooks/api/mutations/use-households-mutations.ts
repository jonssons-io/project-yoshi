import {
	createMutationHook,
	invalidateAll,
	invalidateQuery
} from './create-mutation-hook'

/**
 * Hook to create a new household
 */
export const useCreateHousehold = createMutationHook(
	'households',
	'create',
	(variables) => [invalidateQuery(['households', 'list'])]
)

/**
 * Hook to update an existing household
 */
export const useUpdateHousehold = createMutationHook(
	'households',
	'update',
	(variables) => [
		invalidateQuery(['households', 'list']),
		invalidateQuery(['households', 'getById'])
	]
)

/**
 * Hook to delete a household
 * Invalidates ALL related queries since a household contains budgets, categories,
 * accounts, and all child data (transactions, bills)
 */
export const useDeleteHousehold = createMutationHook(
	'households',
	'delete',
	(variables) => [
		invalidateQuery(['households', 'list']),
		invalidateAll('budgets'),
		invalidateAll('categories'),
		invalidateAll('accounts'),
		invalidateAll('transactions'),
		invalidateAll('bills')
	]
)

/**
 * Hook to add a user to a household
 */
export const useAddHouseholdUser = createMutationHook(
	'households',
	'addUser',
	(variables) => [
		invalidateQuery(['households', 'list']),
		invalidateQuery(['households', 'getMembers']),
		invalidateQuery(['households', 'getById'])
	]
)

/**
 * Hook to remove a user from a household
 */
export const useRemoveHouseholdUser = createMutationHook(
	'households',
	'removeUser',
	(variables) => [
		invalidateQuery(['households', 'list']),
		invalidateQuery(['households', 'getMembers']),
		invalidateQuery(['households', 'getById'])
	]
)
