import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/integrations/trpc/react";

/**
 * Hook to fetch list of bills
 * Accepts optional budgetId and userId - query is auto-disabled when either is undefined
 */
export function useBillsList({
	budgetId,
	userId,
	thisMonthOnly = false,
	includeArchived = false,
	enabled = true,
}: {
	budgetId?: string | null;
	userId?: string | null;
	thisMonthOnly?: boolean;
	includeArchived?: boolean;
	enabled?: boolean;
}) {
	const trpc = useTRPC();
	const isEnabled = enabled && !!budgetId && !!userId;
	return useQuery({
		...trpc.bills.list.queryOptions({
			budgetId: budgetId ?? "",
			userId: userId ?? "",
			thisMonthOnly,
			includeArchived,
		}),
		enabled: isEnabled,
	});
}

/**
 * Hook to fetch a single bill by ID
 * Accepts optional billId - query is auto-disabled when undefined
 */
export function useBillById({
	billId,
	enabled = true,
}: {
	billId?: string | null;
	enabled?: boolean;
}) {
	const trpc = useTRPC();
	const isEnabled = enabled && !!billId;
	return useQuery({
		...trpc.bills.getById.queryOptions({ id: billId ?? "" }),
		enabled: isEnabled,
	});
}
