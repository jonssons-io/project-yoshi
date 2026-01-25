import {
	type UseMutationResult,
	useMutation,
	useQueryClient
} from '@tanstack/react-query'
import { useTRPC } from '@/integrations/trpc/react'
import type { MutationCallbacks, RouterInputs, RouterOutputs } from '../types'

/**
 * Type helper to extract route names from the router
 */
type RouteName = keyof RouterInputs

/**
 * Type helper to extract operation names for a given route
 */
type OperationName<TRoute extends RouteName> = keyof RouterInputs[TRoute]

/**
 * Query key to invalidate after a successful mutation
 */
/**
 * Query key to invalidate after a successful mutation
 */
export type InvalidationKey =
	| { strategy: 'all'; resource: string }
	| { strategy: 'query'; resource: string; procedure: string; input?: unknown }
	| {
			queryKey: unknown[]
			refetchType?: 'all' | 'active' | 'inactive'
	  }

/**
 * Factory function to create mutation hooks with automatic query invalidation
 *
 * @template TRoute - The route name (e.g., "accounts", "budgets")
 * @template TOperation - The operation name (e.g., "create", "update", "delete")
 *
 * @param route - The tRPC route name
 * @param operation - The operation to perform
 * @param getInvalidationKeys - Function that returns query keys to invalidate after success
 *
 * @returns A hook function that accepts optional callbacks and returns a mutation
 *
 * @example
 * ```typescript
 * export const useCreateAccount = createMutationHook(
 *   "accounts",
 *   "create",
 *   () => [invalidateAll("accounts")]
 * );
 * ```
 */
export function createMutationHook<
	TRoute extends RouteName,
	TOperation extends OperationName<TRoute>
>(
	route: TRoute,
	operation: TOperation,
	getInvalidationKeys: (
		variables: RouterInputs[TRoute][TOperation]
	) => InvalidationKey[]
) {
	type TInput = RouterInputs[TRoute][TOperation]
	type TOutput = RouterOutputs[TRoute][TOperation]

	return function useMutationHook(
		callbacks?: MutationCallbacks<TOutput, TInput>
	): UseMutationResult<TOutput, Error, TInput> {
		const trpc = useTRPC()
		const queryClient = useQueryClient()

		// biome-ignore lint/suspicious/noExplicitAny: <The `as any` is necessary because TypeScript cannot infer the deeply nested dynamic structure of tRPC's router using string literal indexing. Type safety is maintained through the generic constraints (TRoute, TOperation) and the properly typed TInput/TOutput that come from the router inference.>
		const mutationOptions = (trpc[route] as any)[operation].mutationOptions({
			onSuccess: async (data: TOutput, variables: TInput) => {
				// Invalidate queries based on the provided strategy
				const keysToInvalidate = getInvalidationKeys(variables)
				await Promise.all(
					keysToInvalidate.map((key) => {
						if ('strategy' in key) {
							// biome-ignore lint/suspicious/noExplicitAny: Dynamic access to router
							const router = (trpc as any)[key.resource]
							if (!router) return Promise.resolve()

							if (key.strategy === 'all') {
								if (typeof router.pathFilter === 'function') {
									return queryClient.invalidateQueries(router.pathFilter())
								}
							} else if (key.strategy === 'query') {
								const proc = router[key.procedure]
								if (proc && typeof proc.queryKey === 'function') {
									return queryClient.invalidateQueries({
										queryKey: proc.queryKey(key.input)
									})
								}
							}
						}
						// Fallback for legacy or raw keys
						return queryClient.invalidateQueries(key as { queryKey: unknown[] })
					})
				)

				// Call user-provided success callback
				callbacks?.onSuccess?.(data, variables)
			},
			onError: (error: Error, variables: TInput) => {
				// Call user-provided error callback
				callbacks?.onError?.(error, variables)
			}
		})

		return useMutation(mutationOptions)
	}
}

/**
 * Helper to create an invalidation key that refetches all queries for a resource
 */
export const invalidateAll = (resource: string): InvalidationKey => ({
	strategy: 'all',
	resource
})

/**
 * Helper to create an invalidation key for a specific query
 */
export const invalidateQuery = (...keyParts: unknown[]): InvalidationKey => {
	if (
		keyParts.length >= 2 &&
		typeof keyParts[0] === 'string' &&
		typeof keyParts[1] === 'string'
	) {
		return {
			strategy: 'query',
			resource: keyParts[0],
			procedure: keyParts[1],
			input: keyParts[2]
		}
	}
	return {
		queryKey: keyParts
	}
}
