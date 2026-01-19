import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/integrations/trpc/react";

/**
 * Hook to fetch list of transactions
 * Accepts optional budgetId and userId - query is auto-disabled when either is undefined
 */
export function useTransactionsList({
	budgetId,
	userId,
	type,
	dateFrom,
	dateTo,
	enabled = true,
}: {
	budgetId?: string | null;
	userId?: string | null;
	type?: "INCOME" | "EXPENSE";
	dateFrom?: Date;
	dateTo?: Date;
	enabled?: boolean;
}) {
	const trpc = useTRPC();
	const isEnabled = enabled && !!budgetId && !!userId;
	return useQuery({
		...trpc.transactions.list.queryOptions({
			budgetId: budgetId ?? "",
			userId: userId ?? "",
			type,
			dateFrom,
			dateTo,
		}),
		enabled: isEnabled,
	});
}
