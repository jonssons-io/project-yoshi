import { useQuery } from '@tanstack/react-query'
import {
	getRecipientOptions,
	listRecipientsOptions
} from '@/api/generated/@tanstack/react-query.gen'
import type { GetRecipientData, ListRecipientsData } from '@/api/generated/types.gen'

/**
 * Hook to fetch list of recipients for a household
 * Query is auto-disabled when householdId or userId is undefined/null
 */
export function useRecipientsList(params: {
	householdId?: ListRecipientsData['path']['householdId'] | null
	userId?: string | null
	enabled?: boolean
}) {
	const { householdId, enabled = true } = params
	return useQuery({
		...listRecipientsOptions({
			path: { householdId: householdId ?? '' }
		}),
		enabled: enabled && !!householdId,
		select: (response) => response.data ?? []
	})
}

/**
 * Hook to fetch a single recipient by ID
 * Query is auto-disabled when recipientId or userId is undefined/null
 */
export function useRecipientById(params: {
	recipientId?: GetRecipientData['path']['recipientId'] | null
	userId?: string | null
	enabled?: boolean
}) {
	const { recipientId, enabled = true } = params
	return useQuery({
		...getRecipientOptions({
			path: { recipientId: recipientId ?? '' }
		}),
		enabled: enabled && !!recipientId
	})
}
