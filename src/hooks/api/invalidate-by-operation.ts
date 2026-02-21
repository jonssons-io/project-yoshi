import type { QueryClient } from '@tanstack/react-query'

export function invalidateByOperation(
	queryClient: QueryClient,
	operationId: string
): Promise<void> {
	return queryClient
		.invalidateQueries({
			predicate: (query) => {
				const firstKey = query.queryKey[0]
				if (!firstKey || typeof firstKey !== 'object') {
					return false
				}
				return (
					'_id' in firstKey &&
					(firstKey as { _id?: string })._id === operationId
				)
			}
		})
		.then(() => undefined)
}
