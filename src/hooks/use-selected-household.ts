import { useEffect, useState } from "react";
import { useHouseholdsList } from "@/hooks/api";

const STORAGE_KEY_PREFIX = "yoshi-selected-household-id";

/**
 * Custom hook to manage and persist the selected household ID
 * Scopes the storage to the current user to prevent conflicts when multiple users share a browser
 */
export function useSelectedHousehold(userId?: string) {
	const [selectedHouseholdId, setSelectedHouseholdIdState] = useState<
		string | null
	>(null);
	const [isLoading, setIsLoading] = useState(true);

	// Generate user-specific storage key
	const storageKey = userId ? `${STORAGE_KEY_PREFIX}-${userId}` : null;

	// Fetch households to validate selection
	const { data: households, isLoading: isHouseholdsLoading } =
		useHouseholdsList({
			userId,
		});

	// Load from localStorage on mount or when userId changes
	useEffect(() => {
		if (storageKey) {
			const stored = localStorage.getItem(storageKey);
			if (stored) {
				setSelectedHouseholdIdState(stored);
			} else {
				setSelectedHouseholdIdState(null);
			}
		} else {
			setSelectedHouseholdIdState(null);
		}
		setIsLoading(false);
	}, [storageKey]);

	// Validate selection against available households and auto-select if only one exists
	useEffect(() => {
		if (isHouseholdsLoading || !households) return;

		const isCurrentSelectionValid = selectedHouseholdId
			? households.some((h) => h.id === selectedHouseholdId)
			: false;

		// Determine what the selection should be
		let newSelection: string | null = selectedHouseholdId;

		// If current selection is invalid
		if (selectedHouseholdId && !isCurrentSelectionValid) {
			// Clear the invalid selection
			newSelection = null;
			// But if only one household exists, auto-select it
			if (households.length === 1) {
				newSelection = households[0].id;
			}
		} else if (!selectedHouseholdId && households.length === 1) {
			// No selection and only one household available, auto-select it
			newSelection = households[0].id;
		}

		// Apply the new selection if it changed
		if (newSelection !== selectedHouseholdId) {
			setSelectedHouseholdIdState(newSelection);
			if (storageKey) {
				if (newSelection) {
					localStorage.setItem(storageKey, newSelection);
				} else {
					localStorage.removeItem(storageKey);
				}
			}
		}
	}, [isHouseholdsLoading, households, selectedHouseholdId, storageKey]);

	// Sync with localStorage changes from other tabs
	useEffect(() => {
		if (!storageKey) return;

		const handleStorageChange = (e: StorageEvent) => {
			if (e.key === storageKey) {
				setSelectedHouseholdIdState(e.newValue);
			}
		};

		window.addEventListener("storage", handleStorageChange);
		return () => window.removeEventListener("storage", handleStorageChange);
	}, [storageKey]);

	// Update localStorage when selection changes
	const setSelectedHousehold = (householdId: string | null) => {
		setSelectedHouseholdIdState(householdId);
		if (storageKey) {
			if (householdId) {
				localStorage.setItem(storageKey, householdId);
			} else {
				localStorage.removeItem(storageKey);
			}
		}
	};

	return {
		selectedHouseholdId,
		setSelectedHousehold,
		isLoading: isLoading || isHouseholdsLoading,
	};
}
