import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/integrations/trpc/react";

/**
 * Hook to fetch list of accounts for a household
 * Accepts optional householdId and userId - query is auto-disabled when either is undefined
 */
export function useAccountsList({
	householdId,
	userId,
	budgetId,
	enabled = true,
}: {
	householdId?: string | null;
	userId?: string | null;
	budgetId?: string | null;
	enabled?: boolean;
}) {
	const trpc = useTRPC();
	const isEnabled = enabled && !!householdId && !!userId;
	return useQuery({
		...trpc.accounts.list.queryOptions({
			householdId: householdId ?? "",
			userId: userId ?? "",
			budgetId: budgetId || undefined,
		}),
		enabled: isEnabled,
	});
}

/**
 * Hook to fetch a single account by ID
 * Accepts optional accountId and userId - query is auto-disabled when either is undefined
 */
export function useAccountById({
	accountId,
	userId,
	enabled = true,
}: {
	accountId?: string | null;
	userId?: string | null;
	enabled?: boolean;
}) {
	const trpc = useTRPC();
	const isEnabled = enabled && !!accountId && !!userId;
	return useQuery({
		...trpc.accounts.getById.queryOptions({
			id: accountId ?? "",
			userId: userId ?? "",
		}),
		enabled: isEnabled,
	});
}

/**
 * Hook to fetch account balance
 * Accepts optional accountId and userId - query is auto-disabled when either is undefined
 */
export function useAccountBalance({
	accountId,
	userId,
	enabled = true,
}: {
	accountId?: string | null;
	userId?: string | null;
	enabled?: boolean;
}) {
	const trpc = useTRPC();
	const isEnabled = enabled && !!accountId && !!userId;
	return useQuery({
		...trpc.accounts.getBalance.queryOptions({
			id: accountId ?? "",
			userId: userId ?? "",
		}),
		enabled: isEnabled,
	});
}
