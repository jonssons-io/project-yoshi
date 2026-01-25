/**
 * Household Form Component
 * Used for creating and editing households
 */

import { useUser } from '@clerk/clerk-react'
import { Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	useAddHouseholdUser,
	useCreateInvitation,
	useHouseholdInvitations,
	useHouseholdMembers,
	useRemoveHouseholdUser,
	useRevokeInvitation
} from '@/hooks/api'
import { useAppForm } from '@/hooks/form'
import { createZodValidator, validateForm } from '@/lib/form-validation'

const householdSchema = z.object({
	name: z.string().min(1, { message: 'Name is required' })
})

type HouseholdFormData = z.infer<typeof householdSchema>

interface HouseholdFormProps {
	defaultValues?: Partial<HouseholdFormData>
	onSubmit: (data: HouseholdFormData) => Promise<void> | void
	onCancel?: () => void
	onDelete?: () => void
	submitLabel?: string
	householdId?: string // Optional, for edit mode
}

export function HouseholdForm({
	defaultValues,
	onSubmit,
	onCancel,
	onDelete,
	submitLabel = 'Save',
	householdId
}: HouseholdFormProps) {
	const { user } = useUser()
	const userId = user?.id

	const form = useAppForm({
		defaultValues: {
			name: defaultValues?.name ?? ''
		},
		onSubmit: async ({ value }) => {
			const data = validateForm(householdSchema, value)
			await onSubmit(data)
		}
	})

	const [inviteEmail, setInviteEmail] = useState('')

	// Fetch data if in edit mode
	const { data: members } = useHouseholdMembers({
		householdId,
		userId,
		enabled: !!householdId && !!userId
	})

	const { data: invitations } = useHouseholdInvitations({
		householdId,
		userId,
		enabled: !!householdId && !!userId
	})

	const { mutate: inviteMember, isPending: isInviting } = useCreateInvitation({
		onSuccess: () => {
			setInviteEmail('')
		}
	})

	const { mutate: removeMember } = useRemoveHouseholdUser({})
	const { mutate: revokeInvitation } = useRevokeInvitation({})

	const handleInvite = () => {
		if (!householdId || !userId || !inviteEmail) return
		inviteMember({
			email: inviteEmail,
			householdId,
			userId
		})
	}

	return (
		<div className="space-y-6">
			<form
				onSubmit={(e) => {
					e.preventDefault()
					e.stopPropagation()
					form.handleSubmit()
				}}
			>
				<div className="space-y-4">
					<form.AppField
						name="name"
						validators={{
							onChange: createZodValidator(householdSchema.shape.name)
						}}
					>
						{(field) => (
							<field.TextField
								label="Household Name"
								placeholder="e.g., Smith Family, Roommates"
							/>
						)}
					</form.AppField>

					<form.AppForm>
						<form.FormButtonGroup
							onDelete={onDelete}
							onCancel={onCancel}
							submitLabel={submitLabel}
						/>
					</form.AppForm>
				</div>
			</form>

			{householdId && userId && (
				<div className="space-y-6 pt-6 border-t">
					<div>
						<h3 className="text-lg font-medium mb-4">Members</h3>
						<div className="space-y-3">
							{members?.map((member) => (
								<div
									key={member.id}
									className="flex items-center justify-between p-2 rounded-lg border bg-card"
								>
									<div className="flex items-center gap-3">
										<Avatar className="h-8 w-8">
											<AvatarImage src={member.user?.imageUrl} />
											<AvatarFallback>
												{member.user?.firstName?.slice(0, 2).toUpperCase() ??
													'U'}
											</AvatarFallback>
										</Avatar>
										<div>
											<p className="text-sm font-medium">
												{member.user?.fullName ?? 'Unknown User'}
											</p>
											<p className="text-xs text-muted-foreground">
												{member.user?.email}
											</p>
										</div>
									</div>
									{member.userId !== userId && (
										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
											onClick={() =>
												removeMember({
													householdId,
													userId,
													removeUserId: member.userId
												})
											}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									)}
								</div>
							))}
						</div>
					</div>

					<div>
						<h3 className="text-lg font-medium mb-4">Invite Member</h3>
						<div className="flex gap-2 mb-4">
							<Input
								placeholder="Email address"
								value={inviteEmail}
								onChange={(e) => setInviteEmail(e.target.value)}
								type="email"
							/>
							<Button
								onClick={handleInvite}
								disabled={!inviteEmail || isInviting}
							>
								Send
							</Button>
						</div>

						{invitations && invitations.length > 0 && (
							<div className="space-y-2">
								<h4 className="text-sm font-medium text-muted-foreground">
									Pending Invitations
								</h4>
								<div className="space-y-2">
									{invitations.map((invitation) => (
										<div
											key={invitation.id}
											className="flex items-center justify-between p-2 rounded-lg border bg-muted/50"
										>
											<span className="text-sm">{invitation.email}</span>
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8"
												onClick={() =>
													revokeInvitation({
														invitationId: invitation.id,
														userId
													})
												}
											>
												<X className="h-4 w-4" />
											</Button>
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	)
}
