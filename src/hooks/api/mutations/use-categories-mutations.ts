import {
	createMutationHook,
	invalidateAll,
	invalidateQuery,
} from "./create-mutation-hook";

/**
 * Hook to create a new category
 */
export const useCreateCategory = createMutationHook(
	"categories",
	"create",
	() => [invalidateAll("categories")],
);

/**
 * Hook to update an existing category
 */
export const useUpdateCategory = createMutationHook(
	"categories",
	"update",
	(variables) => [
		invalidateAll("categories"),
		invalidateQuery("categories", "getById", {
			id: variables.id,
			userId: variables.userId,
		}),
	],
);

/**
 * Hook to delete a category
 * Note: Categories cannot be deleted if transactions or bills reference them (Restrict policy)
 */
export const useDeleteCategory = createMutationHook(
	"categories",
	"delete",
	() => [invalidateAll("categories")],
);
