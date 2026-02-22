import { useQuery } from '@tanstack/react-query'
import {
	getHouseholdMembersOptions,
	getHouseholdOptions,
	listHouseholdsOptions
} from '@/api/generated/@tanstack/react-query.gen'
import type {
	GetHouseholdData,
	GetHouseholdMembersData
} from '@/api/generated/types.gen'

/**
 * Hook to fetch list of households for a user
 * Query is auto-disabled when userId is undefined/null
 */
export function useHouseholdsList(params: {
	userId?: string | null
	enabled?: boolean
}) {
	const { enabled = true } = params
	return useQuery({
		...listHouseholdsOptions(),
		enabled,
		select: (response) => response.data ?? []
	})
}

/**
 * Hook to fetch a single household by ID
 * Query is auto-disabled when householdId or userId is undefined/null
 */
export function useHouseholdById(params: {
	householdId?: GetHouseholdData['path']['householdId'] | null
	userId?: string | null
	enabled?: boolean
}) {
	const { householdId, enabled = true } = params
	return useQuery({
		...getHouseholdOptions({
			path: { householdId: householdId ?? '' }
		}),
		enabled: enabled && !!householdId
	})
}

/**
 * Hook to fetch members of a household
 */
export function useHouseholdMembers(params: {
	householdId?: GetHouseholdMembersData['path']['householdId'] | null
	userId?: string | null
	enabled?: boolean
}) {
	const { householdId, enabled = true } = params
	return useQuery({
		...getHouseholdMembersOptions({
			path: { householdId: householdId ?? '' }
		}),
		enabled: enabled && !!householdId,
		select: (response) => response.data ?? []
	})
}
