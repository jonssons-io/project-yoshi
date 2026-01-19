import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/integrations/trpc/react";

/**
 * Hook to fetch list of budgets for a household
 * Accepts optional householdId and userId - query is auto-disabled when either is undefined
 */
export function useBudgetsList({
	householdId,
	userId,
	enabled = true,
}: {
	householdId?: string | null;
	userId?: string | null;
	enabled?: boolean;
}) {
	const trpc = useTRPC();
	const isEnabled = enabled && !!householdId && !!userId;
	return useQuery({
		...trpc.budgets.list.queryOptions({
			householdId: householdId ?? "",
			userId: userId ?? "",
		}),
		enabled: isEnabled,
	});
}

/**
 * Hook to fetch a single budget by ID
 * Accepts optional budgetId and userId - query is auto-disabled when either is undefined
 */
export function useBudgetById({
	budgetId,
	userId,
	enabled = true,
}: {
	budgetId?: string | null;
	userId?: string | null;
	enabled?: boolean;
}) {
	const trpc = useTRPC();
	const isEnabled = enabled && !!budgetId && !!userId;
	return useQuery({
		...trpc.budgets.getById.queryOptions({
			id: budgetId ?? "",
			userId: userId ?? "",
		}),
		enabled: isEnabled,
	});
}
