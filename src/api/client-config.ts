import { client } from '@/api/generated/client.gen'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

client.setConfig({
	baseUrl: API_BASE_URL
})

let configured = false

/**
 * Configures generated REST client auth and base URL.
 * Only applies the configuration once to prevent repeated setConfig
 * calls from destabilizing query subscriptions.
 */
export function configureApiClient(
	getToken: () => Promise<string | null>
): void {
	if (configured) return
	configured = true
	client.setConfig({
		baseUrl: API_BASE_URL,
		auth: async () => {
			const token = await getToken()
			return token ?? ''
		}
	})
}
