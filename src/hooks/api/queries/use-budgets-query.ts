import { createQueryHook } from "./create-query-hook";

/**
 * Hook to fetch list of budgets for a household
 * Query is auto-disabled when householdId or userId is undefined/null
 */
export const useBudgetsList = createQueryHook(
	"budgets",
	"list",
	(params: {
		householdId?: string | null;
		userId?: string | null;
		enabled?: boolean;
	}) => ({
		householdId: params.householdId ?? "",
		userId: params.userId ?? "",
	}),
	(params) => [params.householdId, params.userId],
);

/**
 * Hook to fetch a single budget by ID
 * Query is auto-disabled when budgetId or userId is undefined/null
 */
export const useBudgetById = createQueryHook(
	"budgets",
	"getById",
	(params: {
		budgetId?: string | null;
		userId?: string | null;
		enabled?: boolean;
	}) => ({
		id: params.budgetId ?? "",
		userId: params.userId ?? "",
	}),
	(params) => [params.budgetId, params.userId],
);
