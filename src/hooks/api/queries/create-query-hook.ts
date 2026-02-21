/**
 * @deprecated Legacy tRPC factory retained during REST migration.
 */
export function createQueryHook() {
	throw new Error(
		'createQueryHook is deprecated. Use generated REST query options hooks instead.'
	)
}
