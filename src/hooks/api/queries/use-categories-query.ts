import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/integrations/trpc/react";

/**
 * Hook to fetch list of categories for a household
 * Accepts optional householdId and userId - query is auto-disabled when either is undefined
 */
export function useCategoriesList({
	householdId,
	userId,
	budgetId,
	type,
	enabled = true,
}: {
	householdId?: string | null;
	userId?: string | null;
	budgetId?: string | null;
	type?: "INCOME" | "EXPENSE";
	enabled?: boolean;
}) {
	const trpc = useTRPC();
	const isEnabled = enabled && !!householdId && !!userId;
	return useQuery({
		...trpc.categories.list.queryOptions({
			householdId: householdId ?? "",
			userId: userId ?? "",
			budgetId: budgetId || undefined,
			type,
		}),
		enabled: isEnabled,
	});
}

/**
 * Hook to fetch a single category by ID
 * Accepts optional categoryId and userId - query is auto-disabled when either is undefined
 */
export function useCategoryById({
	categoryId,
	userId,
	enabled = true,
}: {
	categoryId?: string | null;
	userId?: string | null;
	enabled?: boolean;
}) {
	const trpc = useTRPC();
	const isEnabled = enabled && !!categoryId && !!userId;
	return useQuery({
		...trpc.categories.getById.queryOptions({
			id: categoryId ?? "",
			userId: userId ?? "",
		}),
		enabled: isEnabled,
	});
}
