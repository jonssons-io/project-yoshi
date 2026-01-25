import { createMutationHook, invalidateAll } from './create-mutation-hook'

/**
 * Hook to create a new income
 */
export const useCreateIncome = createMutationHook('income', 'create', () => [
	invalidateAll('income')
])

/**
 * Hook to update an existing income
 */
export const useUpdateIncome = createMutationHook('income', 'update', () => [
	invalidateAll('income')
])

/**
 * Hook to delete an income
 */
export const useDeleteIncome = createMutationHook('income', 'delete', () => [
	invalidateAll('income')
])

/**
 * Hook to archive/unarchive an income
 */
export const useArchiveIncome = createMutationHook('income', 'archive', () => [
	invalidateAll('income')
])
