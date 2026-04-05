import { useUser } from '@clerk/clerk-react'
import { Plus, User } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import {
  type HouseholdMember,
  InvitationStatus
} from '@/api/generated/types.gen'
import { Badge } from '@/components/badge/badge'
import { Button } from '@/components/button/button'
import { IconButton } from '@/components/icon-button/icon-button'
import {
  InputShell,
  InputShellIcon,
  inputInnerClassName
} from '@/components/input-shell/input-shell'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/contexts/auth-context'
import { useHouseholdContext } from '@/contexts/household-context'
import {
  useCreateInvitation,
  useHouseholdInvitations,
  useHouseholdMembers,
  useUpdateHousehold
} from '@/hooks/api'
import { getErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'

export type EditHouseholdDrawerProps = {
  onClose: () => void
}

function initialsFromProfile(
  fullName: string | null | undefined,
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  email: string | null | undefined
): string {
  const combined =
    fullName?.trim() ||
    [
      firstName,
      lastName
    ]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    ''
  if (combined) {
    const parts = combined.split(/\s+/).filter(Boolean).slice(0, 2)
    return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || 'U'
  }
  if (email) {
    const local = email.split('@')[0] ?? email
    return local.slice(0, 2).toUpperCase()
  }
  return '?'
}

function displayMemberName(
  t: (k: string) => string,
  fullName: string | null | undefined,
  firstName: string | null | undefined,
  lastName: string | null | undefined
): string {
  const n =
    fullName?.trim() ||
    [
      firstName,
      lastName
    ]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    ''
  return n || t('forms.unknownUser')
}

type MemberListRow = Pick<HouseholdMember, 'userId' | 'user'>

/**
 * For the signed-in user, prefer Clerk session data (same source as the sidebar menu);
 * the API `user` embed is often empty or stale for `member.userId === clerk.id`.
 */
function resolveMemberProfile(
  member: MemberListRow,
  clerkUser: ReturnType<typeof useUser>['user']
): {
  fullName: string | null | undefined
  firstName: string | null | undefined
  lastName: string | null | undefined
  email: string | null | undefined
  imageUrl: string | null | undefined
} {
  const u = member.user
  if (!clerkUser?.id || member.userId !== clerkUser.id) {
    return {
      fullName: u?.fullName,
      firstName: u?.firstName,
      lastName: u?.lastName,
      email: u?.email,
      imageUrl: u?.imageUrl
    }
  }

  return {
    fullName: clerkUser.fullName ?? u?.fullName,
    firstName: clerkUser.firstName ?? u?.firstName,
    lastName: clerkUser.lastName ?? u?.lastName,
    email: clerkUser.primaryEmailAddress?.emailAddress ?? u?.email ?? undefined,
    imageUrl: clerkUser.imageUrl ?? u?.imageUrl
  }
}

/**
 * Edit household name, list members (profiles from API / Clerk sync), invite by email.
 */
export function EditHouseholdDrawer({ onClose }: EditHouseholdDrawerProps) {
  const { t } = useTranslation()
  const { user: clerkUser } = useUser()
  const { userId, householdId } = useAuth()
  const { households } = useHouseholdContext()
  const [name, setName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')

  const { data: members = [], isPending: membersPending } = useHouseholdMembers(
    {
      householdId,
      userId,
      enabled: !!householdId
    }
  )

  const { data: invitations = [], isPending: invitesPending } =
    useHouseholdInvitations({
      householdId,
      userId,
      enabled: !!householdId
    })

  const { mutateAsync: updateHouseholdAsync, isPending: isSaving } =
    useUpdateHousehold()

  const { mutateAsync: createInviteAsync, isPending: isInviting } =
    useCreateInvitation()

  const householdName = useMemo(
    () => households?.find((h) => h.id === householdId)?.name ?? '',
    [
      households,
      householdId
    ]
  )

  useEffect(() => {
    setName(householdName)
  }, [
    householdName
  ])

  const memberEmails = useMemo(() => {
    const set = new Set<string>()
    for (const m of members) {
      const e = m.user?.email?.toLowerCase()
      if (e) set.add(e)
    }
    return set
  }, [
    members
  ])

  const pendingInvites = useMemo(
    () =>
      invitations.filter(
        (inv) =>
          inv.status === InvitationStatus.PENDING &&
          !memberEmails.has(inv.email.toLowerCase())
      ),
    [
      invitations,
      memberEmails
    ]
  )

  const emailSchema = useMemo(() => z.string().email(), [])

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error(t('validation.nameRequired'))
      return
    }
    if (!householdId) return
    try {
      await updateHouseholdAsync({
        id: householdId,
        name: trimmed,
        userId
      })
      toast.success(t('households.updateSuccess'))
      onClose()
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const handleInvite = async () => {
    const trimmed = inviteEmail.trim()
    const parsed = emailSchema.safeParse(trimmed)
    if (!parsed.success) {
      toast.error(t('validation.emailInvalid'))
      return
    }
    if (!householdId) return
    try {
      await createInviteAsync({
        householdId,
        email: parsed.data,
        userId
      })
      setInviteEmail('')
      toast.success(t('drawers.editHousehold.inviteSent'))
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  if (!householdId) {
    return (
      <div className="flex h-full items-center justify-center px-2 text-center">
        <p className="type-body text-gray-800">
          {t('drawers.editHousehold.noHouseholdSelected')}
        </p>
      </div>
    )
  }

  const isLoadingList = membersPending || invitesPending

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
        <div className="flex flex-col gap-1">
          <span className="type-label text-gray-600">
            {t('drawers.editHousehold.nameLabel')}
          </span>
          <InputShell>
            <InputShellIcon>
              <User aria-hidden={true} />
            </InputShellIcon>
            <input
              type="text"
              autoComplete="organization"
              value={name}
              disabled={isSaving}
              onChange={(e) => {
                setName(e.target.value)
              }}
              className={cn(inputInnerClassName)}
            />
          </InputShell>
        </div>

        <div className="flex flex-col gap-2">
          <span className="type-label text-gray-600">{t('forms.members')}</span>
          {isLoadingList ? (
            <p className="type-body-small text-gray-600">
              {t('common.loading')}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {members.map((member, index) => {
                const p = resolveMemberProfile(member, clerkUser)
                const label = displayMemberName(
                  t,
                  p.fullName,
                  p.firstName,
                  p.lastName
                )
                const email = p.email ?? ''
                const initials = initialsFromProfile(
                  p.fullName,
                  p.firstName,
                  p.lastName,
                  p.email
                )
                const tint =
                  index % 2 === 0
                    ? 'bg-teal-200 text-teal-900'
                    : 'bg-lilac-200 text-lilac-800'
                return (
                  <li
                    key={member.userId}
                    className="flex items-center gap-3"
                  >
                    {p.imageUrl ? (
                      <Avatar className="size-10 shrink-0">
                        <AvatarImage
                          src={p.imageUrl}
                          alt={label}
                        />
                        <AvatarFallback
                          className={cn('text-sm font-medium', tint)}
                        >
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div
                        className={cn(
                          'flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-medium',
                          tint
                        )}
                        aria-hidden={true}
                      >
                        {initials}
                      </div>
                    )}
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="type-label font-bold text-black">
                        {label}
                      </span>
                      {email ? (
                        <span className="type-label-small text-gray-600">
                          {email}
                        </span>
                      ) : null}
                    </div>
                    <Badge
                      color="green"
                      label={t('drawers.editHousehold.statusMember')}
                    />
                  </li>
                )
              })}
              {pendingInvites.map((inv, index) => {
                const tint =
                  (members.length + index) % 2 === 0
                    ? 'bg-teal-200 text-teal-900'
                    : 'bg-lilac-200 text-lilac-800'
                const initials = inv.email.slice(0, 2).toUpperCase()
                return (
                  <li
                    key={inv.id}
                    className="flex items-center gap-3"
                  >
                    {/* Invited rows have no photo: skip Radix Avatar (idle image state can drop tint). */}
                    <div
                      className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-medium',
                        tint
                      )}
                      aria-hidden={true}
                    >
                      {initials}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="type-label font-bold text-black">
                        {inv.email}
                      </span>
                    </div>
                    <Badge
                      color="blue"
                      label={t('drawers.editHousehold.statusInvited')}
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <span className="type-label text-gray-600">
            {t('drawers.editHousehold.addLabel')}
          </span>
          <div className="flex items-stretch gap-2">
            <InputShell className="flex-1">
              <InputShellIcon>
                <User aria-hidden={true} />
              </InputShellIcon>
              <input
                type="email"
                autoComplete="email"
                placeholder={t('forms.emailAddress')}
                value={inviteEmail}
                disabled={isInviting}
                onChange={(e) => {
                  setInviteEmail(e.target.value)
                }}
                className={cn(inputInnerClassName)}
              />
            </InputShell>
            <IconButton
              type="button"
              variant="filled"
              color="primary"
              aria-label={t('drawers.editHousehold.addInvite')}
              title={t('drawers.editHousehold.addInvite')}
              icon={<Plus aria-hidden={true} />}
              disabled={isInviting || !inviteEmail.trim()}
              onClick={() => {
                void handleInvite()
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-gray-200 pt-4">
        <Button
          type="button"
          variant="outlined"
          color="subtle"
          label={t('common.cancel')}
          onClick={onClose}
        />
        <Button
          type="button"
          variant="filled"
          color="primary"
          icon={<Plus aria-hidden={true} />}
          label={t('drawers.editHousehold.save')}
          disabled={isSaving || !name.trim()}
          onClick={() => {
            void handleSave()
          }}
        />
      </div>
    </div>
  )
}
