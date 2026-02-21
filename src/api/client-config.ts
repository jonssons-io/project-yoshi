import { client } from '@/api/generated/client.gen'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

/**
 * Configures generated REST client auth and base URL.
 */
export function configureApiClient(
	getToken: () => Promise<string | null>
): void {
	client.setConfig({
		baseUrl: API_BASE_URL,
		auth: async () => {
			const token = await getToken()
			return token ?? ''
		}
	})
}
