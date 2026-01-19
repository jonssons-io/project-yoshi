import {
	createMutationHook,
	invalidateAll,
	invalidateQuery,
} from "./create-mutation-hook";

/**
 * Hook to create a new account
 */
export const useCreateAccount = createMutationHook("accounts", "create", () => [
	invalidateAll("accounts"),
]);

/**
 * Hook to update an existing account
 */
export const useUpdateAccount = createMutationHook(
	"accounts",
	"update",
	(variables) => [
		invalidateAll("accounts"),
		invalidateQuery("accounts", "getById", {
			id: variables.id,
			userId: variables.userId,
		}),
		invalidateQuery("accounts", "getBalance", {
			id: variables.id,
			userId: variables.userId,
		}),
	],
);

/**
 * Hook to delete an account
 * Note: Accounts cannot be deleted if transactions or bills reference them (Restrict policy)
 */
export const useDeleteAccount = createMutationHook("accounts", "delete", () => [
	invalidateAll("accounts"),
]);
