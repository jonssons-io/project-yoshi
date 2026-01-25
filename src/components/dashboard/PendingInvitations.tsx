import { useUser } from '@clerk/clerk-react'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	useAcceptInvitation,
	useDeclineInvitation,
	useInvitations
} from '@/hooks/api'

interface PendingInvitationsProps {
	onJoin?: (householdId: string) => void
}

export function PendingInvitations({ onJoin }: PendingInvitationsProps) {
	const { user } = useUser()
	const userId = user?.id

	const { data: invitations } = useInvitations({
		userId,
		enabled: !!userId
	})

	const { mutate: acceptInvitation } = useAcceptInvitation({
		onSuccess: (data) => {
			if (data && onJoin) {
				const householdId = Array.isArray(data)
					? data[1].householdId
					: data.householdId
				onJoin(householdId)
			}
		}
	})
	const { mutate: declineInvitation } = useDeclineInvitation({})

	if (!invitations || invitations.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center p-8 text-center bg-muted/20 rounded-lg">
				<p className="text-muted-foreground">
					You have no pending invitations.
				</p>
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
							Join{' '}
							<span className="font-bold">
								{invitation.household?.name ?? 'Household'}
							</span>
						</p>
						<p className="text-xs text-muted-foreground">
							Invited by {invitation.inviterName}
						</p>
					</div>
					<div className="flex items-center gap-2">
						<Button
							size="icon"
							variant="outline"
							className="text-destructive hover:text-destructive hover:bg-destructive/10"
							title="Decline"
							onClick={() => {
								if (!userId) return
								declineInvitation({
									invitationId: invitation.id,
									userId
								})
							}}
						>
							<X className="h-4 w-4" />
						</Button>
						<Button
							size="icon"
							title="Accept"
							onClick={() => {
								if (!userId) return
								acceptInvitation({
									invitationId: invitation.id,
									userId
								})
							}}
						>
							<Check className="h-4 w-4" />
						</Button>
					</div>
				</div>
			))}
		</div>
	)
}
