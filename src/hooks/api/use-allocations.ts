import {
	createMutationHook,
	invalidateAll,
	invalidateQuery
} from '@/hooks/api/mutations/create-mutation-hook'
import { createQueryHook } from '@/hooks/api/queries/create-query-hook'

export const useAllocationsQuery = createQueryHook(
	'allocations',
	'getUnallocated',
	(params: { householdId: string; userId: string; enabled?: boolean }) => ({
		householdId: params.householdId,
		userId: params.userId
	}),
	(params) => [params.householdId, params.userId]
)

export const useCreateAllocationMutation = createMutationHook(
	'allocations',
	'create',
	() => [
		invalidateQuery('allocations', 'getUnallocated'),
		invalidateAll('budgets')
	]
)

export const useTransferAllocationMutation = createMutationHook(
	'allocations',
	'transfer',
	() => [
		invalidateQuery('allocations', 'getUnallocated'),
		invalidateAll('budgets')
	]
)
