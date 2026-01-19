import { useHouseholdsList } from "@/hooks/api";
import { useLocalStorageSelection } from "./use-local-storage-selection";

const STORAGE_KEY_PREFIX = "yoshi-selected-household-id";

/**
 * Custom hook to manage and persist the selected household ID
 * Scopes the storage to the current user to prevent conflicts when multiple users share a browser
 */
export function useSelectedHousehold(userId?: string) {
	// Generate user-specific storage key
	const storageKey = userId ? `${STORAGE_KEY_PREFIX}-${userId}` : null;

	// Fetch households to validate selection
	const { data: households, isLoading: isHouseholdsLoading } =
		useHouseholdsList({
			userId,
		});

	// Use generic selection hook
	const {
		selectedId: selectedHouseholdId,
		setSelectedId: setSelectedHousehold,
		isLoading,
	} = useLocalStorageSelection({
		storageKey,
		items: households,
		isLoading: isHouseholdsLoading,
		getId: (household) => household.id,
	});

	return {
		selectedHouseholdId,
		setSelectedHousehold,
		isLoading,
	};
}
