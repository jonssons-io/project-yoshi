import { Check, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { InvitationStatus } from '@/api/generated/types.gen'
import { IconButton } from '@/components/icon-button/icon-button'
import { useAuth } from '@/contexts/auth-context'
import {
  useAcceptInvitation,
  useDeclineInvitation,
  useInvitations
} from '@/hooks/api'

export type MyInvitationsDrawerProps = {
  onClose: () => void
}

/**
 * Lists invitations addressed to the current user; accept / decline inline (no footer actions).
 */
export function MyInvitationsDrawer(_props: MyInvitationsDrawerProps) {
  const { t } = useTranslation()
  const { userId, setSelectedHousehold } = useAuth()

  const { data: invitations = [], isPending } = useInvitations({
    userId,
    enabled: !!userId
  })

  const { mutate: acceptInvitation, isPending: isAccepting } =
    useAcceptInvitation({
      onSuccess: (data) => {
        if (data?.householdId) {
          setSelectedHousehold(data.householdId)
        }
      }
    })

  const { mutate: declineInvitation, isPending: isDeclining } =
    useDeclineInvitation({})

  const pending = invitations.filter(
    (inv) => inv.status === InvitationStatus.PENDING
  )

  if (isPending) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="type-body text-gray-800">{t('common.loading')}</p>
      </div>
    )
  }

  if (pending.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg bg-gray-50 px-4 py-8 text-center">
        <p className="type-body text-gray-600">
          {t('dashboard.noInvitations')}
        </p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {pending.map((invitation) => (
        <li
          key={invitation.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="type-label text-black">
              {t('dashboard.join')}{' '}
              <span className="font-bold">
                {invitation.household.name ?? t('nav.household')}
              </span>
            </p>
            <p className="type-label-small text-gray-600">
              {t('dashboard.invitedBy')} {invitation.inviter.name ?? '—'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <IconButton
              variant="filled"
              color="primary"
              title={t('dashboard.accept')}
              aria-label={t('dashboard.accept')}
              icon={<Check aria-hidden={true} />}
              disabled={isAccepting || isDeclining}
              onClick={() => {
                if (!userId) return
                acceptInvitation({
                  invitationId: invitation.id,
                  householdId: invitation.household.id,
                  userId
                })
              }}
            />
            <IconButton
              variant="outlined"
              color="destructive"
              title={t('dashboard.decline')}
              aria-label={t('dashboard.decline')}
              icon={<X aria-hidden={true} />}
              disabled={isAccepting || isDeclining}
              onClick={() => {
                if (!userId) return
                declineInvitation({
                  invitationId: invitation.id,
                  userId
                })
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
