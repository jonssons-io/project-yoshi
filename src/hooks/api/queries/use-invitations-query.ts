import { createQueryHook } from './create-query-hook'

export const useInvitations = createQueryHook(
	'invitations',
	'list',
	(params: { userId?: string; enabled?: boolean }) => ({
		userId: params.userId ?? ''
	}),
	(params) => [params.userId]
)

export const useHouseholdInvitations = createQueryHook(
	'invitations',
	'listByHousehold',
	(params: { householdId?: string; userId?: string; enabled?: boolean }) => ({
		householdId: params.householdId ?? '',
		userId: params.userId ?? ''
	}),
	(params) => [params.householdId, params.userId]
)
