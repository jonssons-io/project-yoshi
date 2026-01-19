import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/integrations/trpc/react";

/**
 * Hook to fetch list of households for a user
 * Accepts optional userId - query is auto-disabled when userId is undefined
 */
export function useHouseholdsList({
	userId,
	enabled = true,
}: {
	userId?: string | null;
	enabled?: boolean;
}) {
	const trpc = useTRPC();
	const isEnabled = enabled && !!userId;
	return useQuery({
		...trpc.households.list.queryOptions({ userId: userId ?? "" }),
		enabled: isEnabled,
	});
}

/**
 * Hook to fetch a single household by ID
 * Accepts optional id and userId - query is auto-disabled when either is undefined
 */
export function useHouseholdById({
	id,
	userId,
	enabled = true,
}: {
	id?: string | null;
	userId?: string | null;
	enabled?: boolean;
}) {
	const trpc = useTRPC();
	const isEnabled = enabled && !!id && !!userId;
	return useQuery({
		...trpc.households.getById.queryOptions({
			id: id ?? "",
			userId: userId ?? "",
		}),
		enabled: isEnabled,
	});
}
