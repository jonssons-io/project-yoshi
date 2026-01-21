/**
 * Central exports for all API hooks
 * This file re-exports all query and mutation hooks for easy importing
 */

// Mutation hooks
export * from './mutations/use-accounts-mutations'
export * from './mutations/use-bills-mutations'
export * from './mutations/use-budgets-mutations'
export * from './mutations/use-categories-mutations'
export * from './mutations/use-households-mutations'
export * from './mutations/use-transactions-mutations'

// Query hooks
export * from './queries/use-accounts-query'
export * from './queries/use-bills-query'
export * from './queries/use-budgets-query'
export * from './queries/use-categories-query'
export * from './queries/use-households-query'
export * from './queries/use-transactions-query'

// Types
export type { MutationCallbacks, RouterInputs, RouterOutputs } from './types'
