import {
	createMutationHook,
	invalidateAll,
	invalidateQuery
} from './create-mutation-hook'

/**
 * Hook to create a new budget
 */
export const useCreateBudget = createMutationHook(
	'budgets',
	'create',
	(variables) => [
		invalidateQuery('budgets', 'list', {
			householdId: variables.householdId,
			userId: variables.userId
		})
	]
)

/**
 * Hook to update an existing budget
 */
export const useUpdateBudget = createMutationHook(
	'budgets',
	'update',
	(variables) => [
		invalidateAll('budgets'),
		invalidateQuery('budgets', 'getById', {
			id: variables.id,
			userId: variables.userId
		})
	]
)

/**
 * Hook to delete a budget
 * Invalidates budgets, transactions, and bills since they cascade on budget delete
 */
export const useDeleteBudget = createMutationHook('budgets', 'delete', () => [
	invalidateAll('budgets'),
	invalidateAll('transactions'),
	invalidateAll('bills')
])

/**
 * Hook to link a category to a budget
 */
export const useLinkBudgetCategory = createMutationHook(
	'budgets',
	'linkCategory',
	(variables) => [
		invalidateQuery('budgets', 'getById', {
			id: variables.budgetId,
			userId: variables.userId
		}),
		invalidateAll('categories')
	]
)

/**
 * Hook to unlink a category from a budget
 */
export const useUnlinkBudgetCategory = createMutationHook(
	'budgets',
	'unlinkCategory',
	(variables) => [
		invalidateQuery('budgets', 'getById', {
			id: variables.budgetId,
			userId: variables.userId
		}),
		invalidateAll('categories')
	]
)

/**
 * Hook to link an account to a budget
 */
export const useLinkBudgetAccount = createMutationHook(
	'budgets',
	'linkAccount',
	(variables) => [
		invalidateQuery('budgets', 'getById', {
			id: variables.budgetId,
			userId: variables.userId
		}),
		invalidateAll('accounts')
	]
)

/**
 * Hook to unlink an account from a budget
 */
export const useUnlinkBudgetAccount = createMutationHook(
	'budgets',
	'unlinkAccount',
	(variables) => [
		invalidateQuery('budgets', 'getById', {
			id: variables.budgetId,
			userId: variables.userId
		}),
		invalidateAll('accounts')
	]
)
