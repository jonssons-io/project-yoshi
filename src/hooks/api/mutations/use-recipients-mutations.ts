import {
	createMutationHook,
	invalidateAll,
	invalidateQuery
} from './create-mutation-hook'

/**
 * Hook to create a new recipient
 */
export const useCreateRecipient = createMutationHook(
	'recipients',
	'create',
	() => [invalidateAll('recipients')]
)

/**
 * Hook to get or create a recipient by name
 * Creates a new recipient if one with the same name doesn't exist
 */
export const useGetOrCreateRecipient = createMutationHook(
	'recipients',
	'getOrCreate',
	() => [invalidateAll('recipients')]
)

/**
 * Hook to update an existing recipient
 */
export const useUpdateRecipient = createMutationHook(
	'recipients',
	'update',
	(variables) => [
		invalidateAll('recipients'),
		invalidateQuery('recipients', 'getById', {
			id: variables.id,
			userId: variables.userId
		})
	]
)

/**
 * Hook to delete a recipient
 * Note: Transactions referencing this recipient will have their recipientId set to null (SetNull policy)
 */
export const useDeleteRecipient = createMutationHook(
	'recipients',
	'delete',
	() => [invalidateAll('recipients')]
)
