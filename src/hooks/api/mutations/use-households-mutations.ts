import {
	createMutationHook,
	invalidateAll,
	invalidateQuery,
} from "./create-mutation-hook";

/**
 * Hook to create a new household
 */
export const useCreateHousehold = createMutationHook(
	"households",
	"create",
	(variables) => [
		invalidateQuery("households", "list", { userId: variables.userId }),
	],
);

/**
 * Hook to update an existing household
 */
export const useUpdateHousehold = createMutationHook(
	"households",
	"update",
	(variables) => [
		invalidateQuery("households", "list", { userId: variables.userId }),
		invalidateQuery("households", "getById", {
			id: variables.id,
			userId: variables.userId,
		}),
	],
);

/**
 * Hook to delete a household
 * Invalidates ALL related queries since a household contains budgets, categories,
 * accounts, and all child data (transactions, bills)
 */
export const useDeleteHousehold = createMutationHook(
	"households",
	"delete",
	(variables) => [
		invalidateQuery("households", "list", { userId: variables.userId }),
		invalidateAll("budgets"),
		invalidateAll("categories"),
		invalidateAll("accounts"),
		invalidateAll("transactions"),
		invalidateAll("bills"),
	],
);

/**
 * Hook to add a user to a household
 */
export const useAddHouseholdUser = createMutationHook(
	"households",
	"addUser",
	(variables) => [
		invalidateQuery("households", "list", { userId: variables.userId }),
		invalidateQuery("households", "getById", {
			id: variables.householdId,
			userId: variables.userId,
		}),
	],
);

/**
 * Hook to remove a user from a household
 */
export const useRemoveHouseholdUser = createMutationHook(
	"households",
	"removeUser",
	(variables) => [
		invalidateQuery("households", "list", { userId: variables.userId }),
		invalidateQuery("households", "getById", {
			id: variables.householdId,
			userId: variables.userId,
		}),
	],
);
