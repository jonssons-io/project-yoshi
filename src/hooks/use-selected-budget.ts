/**
 * Hook to get and set the currently selected budget
 * Uses localStorage to persist the selection
 * Scopes the storage to the current user to prevent conflicts when multiple users share a browser
 */

import { useBudgetsList } from '@/hooks/api'
import { useLocalStorageSelection } from './use-local-storage-selection'

const STORAGE_KEY_PREFIX = 'yoshi-selected-budget'

export function useSelectedBudget(
	userId?: string | null,
	householdId?: string | null
) {
	// Generate user-specific storage key
	const storageKey = userId ? `${STORAGE_KEY_PREFIX}-${userId}` : null

	// Fetch budgets to validate selection
	const { data: budgets, isLoading: isBudgetsLoading } = useBudgetsList({
		householdId,
		userId
	})

	// Use generic selection hook
	const {
		selectedId: selectedBudgetId,
		setSelectedId: setSelectedBudget,
		isLoading
	} = useLocalStorageSelection({
		storageKey,
		items: budgets,
		isLoading: isBudgetsLoading,
		getId: (budget) => budget.id
	})

	return {
		selectedBudgetId,
		setSelectedBudget,
		isLoading
	}
}
