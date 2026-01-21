import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'
import type { TRPCRouter } from '@/integrations/trpc/router'

/**
 * Inferred input types for all tRPC routes
 * Use like: RouterInputs["accounts"]["create"]
 */
export type RouterInputs = inferRouterInputs<TRPCRouter>

/**
 * Inferred output types for all tRPC routes
 * Use like: RouterOutputs["accounts"]["create"]
 */
export type RouterOutputs = inferRouterOutputs<TRPCRouter>

/**
 * Callback interface for mutation hooks
 * TData = output type from the mutation
 * TVariables = input type to the mutation
 */
export interface MutationCallbacks<TData, TVariables> {
	onSuccess?: (data: TData, variables: TVariables) => void
	onError?: (error: Error, variables: TVariables) => void
}
