import { type UseQueryResult, useQuery } from '@tanstack/react-query'
import { useTRPC } from '@/integrations/trpc/react'
import type { RouterInputs, RouterOutputs } from '../types'

/**
 * Type helper to extract route names from the router
 */
type RouteName = keyof RouterInputs

/**
 * Type helper to extract operation names for a given route
 */
type OperationName<TRoute extends RouteName> = keyof RouterInputs[TRoute]

/**
 * Base params that all query hooks accept
 */
interface BaseQueryParams {
	enabled?: boolean
}

/**
 * Factory function to create query hooks with automatic enabled handling
 *
 * @template TRoute - The route name (e.g., "accounts", "budgets")
 * @template TOperation - The operation name (e.g., "list", "getById")
 * @template TParams - Additional parameters the hook accepts
 *
 * @param route - The tRPC route name
 * @param operation - The query operation to perform
 * @param buildInput - Function to transform hook params into tRPC input
 * @param getRequiredParams - Function to extract values that must be truthy for the query to run
 *
 * @returns A hook function that accepts params and returns a query result
 *
 * @example
 * ```typescript
 * export const useHouseholdsList = createQueryHook(
 *   "households",
 *   "list",
 *   (params) => ({ userId: params.userId ?? "" }),
 *   (params) => [params.userId]
 * );
 * ```
 */
export function createQueryHook<
	TRoute extends RouteName,
	TOperation extends OperationName<TRoute>,
	TParams extends BaseQueryParams
>(
	route: TRoute,
	operation: TOperation,
	buildInput: (params: TParams) => RouterInputs[TRoute][TOperation],
	getRequiredParams: (params: TParams) => unknown[]
) {
	type TOutput = RouterOutputs[TRoute][TOperation]

	return function useQueryHook(
		params: TParams
	): UseQueryResult<TOutput, Error> {
		const trpc = useTRPC()

		const { enabled = true, ...rest } = params
		const requiredValues = getRequiredParams(params)
		const isEnabled =
			enabled && requiredValues.every((v) => v != null && v !== '')

		// biome-ignore lint/suspicious/noExplicitAny: <The `as any` is necessary because TypeScript cannot infer the deeply nested dynamic structure of tRPC's router using string literal indexing. Type safety is maintained through the generic constraints (TRoute, TOperation) and the properly typed TOutput that comes from the router inference.>
		const queryOptions = (trpc[route] as any)[operation].queryOptions(
			buildInput(rest as TParams)
		)

		return useQuery({
			...queryOptions,
			enabled: isEnabled
		}) as UseQueryResult<TOutput, Error>
	}
}
