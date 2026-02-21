/**
 * @deprecated Legacy tRPC mutation factory retained during REST migration.
 */
export function createMutationHook() {
	throw new Error(
		'createMutationHook is deprecated. Use generated REST mutation hooks instead.'
	)
}

/**
 * @deprecated Legacy helper retained for compatibility.
 */
export const invalidateAll = (_resource: string) => ({ queryKey: [] as unknown[] })

/**
 * @deprecated Legacy helper retained for compatibility.
 */
export const invalidateQuery = (...keyParts: unknown[]) => ({
	queryKey: keyParts
})
