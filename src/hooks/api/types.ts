/**
 * Callback interface for mutation hooks
 * TData = output type from the mutation
 * TVariables = input type to the mutation
 */
export interface MutationCallbacks<TData, TVariables> {
	onSuccess?: (data: TData, variables: TVariables) => void
	onError?: (error: Error, variables: TVariables) => void
}
