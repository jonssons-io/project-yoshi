import { createMutationHook, invalidateAll } from './create-mutation-hook'

/**
 * Hook to create a new transfer between accounts
 */
export const useCreateTransfer = createMutationHook(
	'transfers',
	'create',
	() => [invalidateAll('transfers'), invalidateAll('accounts')]
)

/**
 * Hook to update an existing transfer
 */
export const useUpdateTransfer = createMutationHook(
	'transfers',
	'update',
	() => [invalidateAll('transfers'), invalidateAll('accounts')]
)

/**
 * Hook to delete a transfer
 */
export const useDeleteTransfer = createMutationHook(
	'transfers',
	'delete',
	() => [invalidateAll('transfers'), invalidateAll('accounts')]
)
