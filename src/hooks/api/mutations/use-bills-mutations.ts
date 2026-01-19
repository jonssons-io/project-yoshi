import {
	createMutationHook,
	invalidateAll,
	invalidateQuery,
} from "./create-mutation-hook";

/**
 * Hook to create a new bill
 */
export const useCreateBill = createMutationHook("bills", "create", () => [
	invalidateAll("bills"),
]);

/**
 * Hook to update an existing bill
 */
export const useUpdateBill = createMutationHook(
	"bills",
	"update",
	(variables) => [
		invalidateAll("bills"),
		invalidateQuery("bills", "getById", { id: variables.id }),
	],
);

/**
 * Hook to delete a bill
 */
export const useDeleteBill = createMutationHook("bills", "delete", () => [
	invalidateAll("bills"),
]);

/**
 * Hook to archive or unarchive a bill
 */
export const useArchiveBill = createMutationHook(
	"bills",
	"archive",
	(variables) => [
		invalidateAll("bills"),
		invalidateQuery("bills", "getById", { id: variables.id }),
	],
);
