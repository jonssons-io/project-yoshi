import { useEffect, useState } from "react";

/**
 * Generic hook for managing a selection in localStorage with validation and auto-selection
 *
 * @template T - Type of items in the list
 * @param storageKey - localStorage key (null disables persistence)
 * @param items - Array of items to select from
 * @param isLoading - Whether items are still loading
 * @param getId - Function to extract ID from an item
 * @returns Selected ID, setter function, and loading state
 */
export function useLocalStorageSelection<T>({
	storageKey,
	items,
	isLoading,
	getId,
}: {
	storageKey: string | null;
	items?: T[];
	isLoading: boolean;
	getId: (item: T) => string;
}) {
	const [selectedId, setSelectedIdState] = useState<string | null>(null);
	const [isInitializing, setIsInitializing] = useState(true);

	// Load from localStorage on mount or when storageKey changes
	useEffect(() => {
		if (storageKey) {
			const stored = localStorage.getItem(storageKey);
			if (stored) {
				setSelectedIdState(stored);
			} else {
				setSelectedIdState(null);
			}
		} else {
			setSelectedIdState(null);
		}
		setIsInitializing(false);
	}, [storageKey]);

	// Validate selection against available items and auto-select if only one exists
	useEffect(() => {
		if (isLoading || !items) return;

		const isCurrentSelectionValid = selectedId
			? items.some((item) => getId(item) === selectedId)
			: false;

		// Determine what the selection should be
		let newSelection: string | null = selectedId;

		// If current selection is invalid
		if (selectedId && !isCurrentSelectionValid) {
			// Clear the invalid selection
			newSelection = null;
			// But if only one item exists, auto-select it
			if (items.length === 1) {
				newSelection = getId(items[0]);
			}
		} else if (!selectedId && items.length === 1) {
			// No selection and only one item available, auto-select it
			newSelection = getId(items[0]);
		}

		// Apply the new selection if it changed
		if (newSelection !== selectedId) {
			setSelectedIdState(newSelection);
			if (storageKey) {
				if (newSelection) {
					localStorage.setItem(storageKey, newSelection);
				} else {
					localStorage.removeItem(storageKey);
				}
			}
		}
	}, [isLoading, items, selectedId, storageKey, getId]);

	// Sync with localStorage changes from other tabs
	useEffect(() => {
		if (!storageKey) return;

		const handleStorageChange = (e: StorageEvent) => {
			if (e.key === storageKey) {
				setSelectedIdState(e.newValue);
			}
		};

		window.addEventListener("storage", handleStorageChange);
		return () => window.removeEventListener("storage", handleStorageChange);
	}, [storageKey]);

	// Update localStorage when selection changes
	const setSelectedId = (id: string | null) => {
		setSelectedIdState(id);
		if (storageKey) {
			if (id) {
				localStorage.setItem(storageKey, id);
			} else {
				localStorage.removeItem(storageKey);
			}
		}
	};

	return {
		selectedId,
		setSelectedId,
		isLoading: isInitializing || isLoading,
	};
}
