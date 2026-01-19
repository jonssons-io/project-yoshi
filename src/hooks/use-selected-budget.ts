/**
 * Hook to get and set the currently selected budget
 * Uses localStorage to persist the selection
 * Scopes the storage to the current user to prevent conflicts when multiple users share a browser
 */

import { useEffect, useState } from "react";
import { useBudgetsList } from "@/hooks/api";

const STORAGE_KEY_PREFIX = "yoshi-selected-budget";

export function useSelectedBudget(
	userId?: string | null,
	householdId?: string | null,
) {
	const [selectedBudgetId, setSelectedBudgetIdState] = useState<string | null>(
		null,
	);
	const [isLoading, setIsLoading] = useState(true);

	// Generate user-specific storage key
	const storageKey = userId ? `${STORAGE_KEY_PREFIX}-${userId}` : null;

	// Fetch budgets to validate selection
	const { data: budgets, isLoading: isBudgetsLoading } = useBudgetsList({
		householdId,
		userId,
	});

	// Load from localStorage on mount or when userId changes
	useEffect(() => {
		if (storageKey) {
			const stored = localStorage.getItem(storageKey);
			if (stored) {
				setSelectedBudgetIdState(stored);
			} else {
				setSelectedBudgetIdState(null);
			}
		} else {
			setSelectedBudgetIdState(null);
		}
		setIsLoading(false);
	}, [storageKey]);

	// Validate selection against available budgets and auto-select if only one exists
	useEffect(() => {
		if (isBudgetsLoading || !budgets || !householdId) return;

		const isCurrentSelectionValid = selectedBudgetId
			? budgets.some((b) => b.id === selectedBudgetId)
			: false;

		// Determine what the selection should be
		let newSelection: string | null = selectedBudgetId;

		// If current selection is invalid
		if (selectedBudgetId && !isCurrentSelectionValid) {
			// Clear the invalid selection
			newSelection = null;
			// But if only one budget exists, auto-select it
			if (budgets.length === 1) {
				newSelection = budgets[0].id;
			}
		} else if (!selectedBudgetId && budgets.length === 1) {
			// No selection and only one budget available, auto-select it
			newSelection = budgets[0].id;
		}

		// Apply the new selection if it changed
		if (newSelection !== selectedBudgetId) {
			setSelectedBudgetIdState(newSelection);
			if (storageKey) {
				if (newSelection) {
					localStorage.setItem(storageKey, newSelection);
				} else {
					localStorage.removeItem(storageKey);
				}
			}
		}
	}, [isBudgetsLoading, budgets, selectedBudgetId, storageKey, householdId]);

	const setSelectedBudget = (budgetId: string | null) => {
		setSelectedBudgetIdState(budgetId);
		if (storageKey) {
			if (budgetId) {
				localStorage.setItem(storageKey, budgetId);
			} else {
				localStorage.removeItem(storageKey);
			}
		}
	};

	// Sync with localStorage changes from other tabs (for the same user)
	useEffect(() => {
		if (!storageKey) return;

		const handleStorageChange = (e: StorageEvent) => {
			if (e.key === storageKey) {
				setSelectedBudgetIdState(e.newValue);
			}
		};

		window.addEventListener("storage", handleStorageChange);
		return () => window.removeEventListener("storage", handleStorageChange);
	}, [storageKey]);

	return {
		selectedBudgetId,
		setSelectedBudget,
		isLoading: isLoading || isBudgetsLoading,
	};
}
