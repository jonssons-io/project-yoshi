import { createQueryHook } from './create-query-hook'

/**
 * Hook to fetch list of recipients for a household
 * Query is auto-disabled when householdId or userId is undefined/null
 */
export const useRecipientsList = createQueryHook(
	'recipients',
	'list',
	(params: {
		householdId?: string | null
		userId?: string | null
		enabled?: boolean
	}) => ({
		householdId: params.householdId ?? '',
		userId: params.userId ?? ''
	}),
	(params) => [params.householdId, params.userId]
)

/**
 * Hook to fetch a single recipient by ID
 * Query is auto-disabled when recipientId or userId is undefined/null
 */
export const useRecipientById = createQueryHook(
	'recipients',
	'getById',
	(params: {
		recipientId?: string | null
		userId?: string | null
		enabled?: boolean
	}) => ({
		id: params.recipientId ?? '',
		userId: params.userId ?? ''
	}),
	(params) => [params.recipientId, params.userId]
)
