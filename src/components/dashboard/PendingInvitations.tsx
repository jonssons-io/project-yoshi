import { useUser } from '@clerk/clerk-react'
import { Check, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { IconButton } from '@/components/icon-button/icon-button'
import {
  useAcceptInvitation,
  useDeclineInvitation,
  useInvitations
} from '@/hooks/api'

interface PendingInvitationsProps {
  onJoin?: (householdId: string) => void
}

export function PendingInvitations({ onJoin }: PendingInvitationsProps) {
  const { t } = useTranslation()
  const { user } = useUser()
  const userId = user?.id

  const { data: invitations } = useInvitations({
    userId,
    enabled: !!userId
  })

  const { mutate: acceptInvitation } = useAcceptInvitation({
    onSuccess: (data) => {
      if (data?.householdId && onJoin) {
        onJoin(data.householdId)
      }
    }
  })
  const { mutate: declineInvitation } = useDeclineInvitation({})

  if (!invitations || invitations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/20 rounded-lg">
        <p className="text-muted-foreground">{t('dashboard.noInvitations')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {invitations.map((invitation) => (
        <div
          key={invitation.id}
          className="flex items-center justify-between p-4 rounded-lg border bg-card"
        >
          <div className="space-y-1">
            <p className="font-medium">
              {t('dashboard.join')}{' '}
              <span className="font-bold">
                {invitation.household?.name ?? t('forms.household')}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.invitedBy')} {invitation.inviter.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <IconButton
              variant="outlined"
              color="destructive"
              title={t('dashboard.decline')}
              icon={<X />}
              onClick={() => {
                if (!userId) return
                declineInvitation({
                  invitationId: invitation.id,
                  userId
                })
              }}
            />
            <IconButton
              variant="filled"
              color="primary"
              title={t('dashboard.accept')}
              icon={<Check />}
              onClick={() => {
                if (!userId) return
                acceptInvitation({
                  invitationId: invitation.id,
                  householdId: invitation.household.id,
                  userId
                })
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
