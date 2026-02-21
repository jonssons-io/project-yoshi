import { useQuery } from '@tanstack/react-query'
import {
	listHouseholdInvitationsOptions,
	listMyInvitationsOptions
} from '@/api/generated/@tanstack/react-query.gen'

export function useInvitations(params: { userId?: string; enabled?: boolean }) {
	const { enabled = true } = params
	return useQuery({
		...listMyInvitationsOptions(),
		enabled,
		select: (response) => response.data ?? []
	})
}

export function useHouseholdInvitations(params: {
	householdId?: string
	userId?: string
	enabled?: boolean
}) {
	const { householdId, enabled = true } = params
	return useQuery({
		...listHouseholdInvitationsOptions({
			path: { householdId: householdId ?? '' }
		}),
		enabled: enabled && !!householdId,
		select: (response) => response.data ?? []
	})
}
