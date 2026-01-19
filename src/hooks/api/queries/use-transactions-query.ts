import { createQueryHook } from "./create-query-hook";

/**
 * Hook to fetch list of transactions for a budget
 * Query is auto-disabled when budgetId or userId is undefined/null
 */
export const useTransactionsList = createQueryHook(
	"transactions",
	"list",
	(params: {
		budgetId?: string | null;
		userId?: string | null;
		type?: "INCOME" | "EXPENSE";
		dateFrom?: Date;
		dateTo?: Date;
		enabled?: boolean;
	}) => ({
		budgetId: params.budgetId ?? "",
		userId: params.userId ?? "",
		type: params.type,
		dateFrom: params.dateFrom,
		dateTo: params.dateTo,
	}),
	(params) => [params.budgetId, params.userId],
);

/**
 * Hook to fetch a single transaction by ID
 * Query is auto-disabled when transactionId or userId is undefined/null
 */
export const useTransactionById = createQueryHook(
	"transactions",
	"getById",
	(params: {
		transactionId?: string | null;
		userId?: string | null;
		enabled?: boolean;
	}) => ({
		id: params.transactionId ?? "",
		userId: params.userId ?? "",
	}),
	(params) => [params.transactionId, params.userId],
);
