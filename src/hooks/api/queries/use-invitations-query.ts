import { useQuery } from '@tanstack/react-query'
import {
  listHouseholdInvitationsOptions,
  listMyInvitationsOptions
} from '@/api/generated/@tanstack/react-query.gen'
import type { ListHouseholdInvitationsData } from '@/api/generated/types.gen'
import { fromApiDate } from '@/hooks/api/date-normalization'

export function useInvitations(params: { userId?: string; enabled?: boolean }) {
  const { enabled = true } = params
  return useQuery({
    ...listMyInvitationsOptions(),
    enabled,
    select: (response) =>
      (response.data ?? []).map((invitation) => ({
        ...invitation,
        createdAt: fromApiDate(invitation.createdAt),
        updatedAt: fromApiDate(invitation.updatedAt)
      }))
  })
}

export function useHouseholdInvitations(params: {
  householdId?: ListHouseholdInvitationsData['path']['householdId']
  userId?: string
  enabled?: boolean
}) {
  const { householdId, enabled = true } = params
  return useQuery({
    ...listHouseholdInvitationsOptions({
      path: {
        householdId: householdId ?? ''
      }
    }),
    enabled: enabled && !!householdId,
    select: (response) =>
      (response.data ?? []).map((invitation) => ({
        ...invitation,
        createdAt: fromApiDate(invitation.createdAt),
        updatedAt: fromApiDate(invitation.updatedAt)
      }))
  })
}
