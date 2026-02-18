import { createClerkClient } from '@clerk/backend'
import type { TRPCRouterRecord } from '@trpc/server'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import i18n from '@/lib/i18n'
import { protectedProcedure } from '../init'

// Initialize Clerk Client
// We need to ensure CLERK_SECRET_KEY is available in the environment
const clerkClient = createClerkClient({
	secretKey: process.env.CLERK_SECRET_KEY
})

export const invitationsRouter = {
	create: protectedProcedure
		.input(
			z.object({
				email: z.string().email(),
				householdId: z.string(),
				userId: z.string()
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { email, householdId, userId } = input

			const membership = await ctx.prisma.householdUser.findUnique({
				where: {
					userId_householdId: {
						userId,
						householdId
					}
				}
			})

			if (!membership) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: i18n.t('households.userNotMember')
				})
			}

			const existingInvitation = await ctx.prisma.invitation.findUnique({
				where: {
					email_householdId: {
						email,
						householdId
					}
				}
			})

			if (existingInvitation) {
				if (existingInvitation.status === 'PENDING') {
					throw new TRPCError({
						code: 'CONFLICT',
						message: i18n.t('invitations.alreadySent')
					})
				}

				// If invitation exists but is not PENDING (e.g. DECLINED or ACCEPTED but user left),
				// we reactivate it.
				return ctx.prisma.invitation.update({
					where: { id: existingInvitation.id },
					data: {
						status: 'PENDING',
						invitedBy: userId
					}
				})
			}

			return ctx.prisma.invitation.create({
				data: {
					email,
					householdId,
					invitedBy: userId
				}
			})
		}),

	list: protectedProcedure
		.input(z.object({ userId: z.string() }))
		.query(async ({ ctx, input }) => {
			const { userId } = input

			try {
				const user = await clerkClient.users.getUser(userId)
				const email = user.emailAddresses.find(
					(e) => e.id === user.primaryEmailAddressId
				)?.emailAddress

				if (!email) {
					return []
				}

				const invitations = await ctx.prisma.invitation.findMany({
					where: {
						email,
						status: 'PENDING'
					},
					include: {
						household: {
							select: {
								name: true
							}
						}
					}
				})

				// Fetch details for inviters
				const inviterIds = [...new Set(invitations.map((i) => i.invitedBy))]

				const users = await clerkClient.users.getUserList({
					userId: inviterIds,
					limit: 100
				})

				return invitations.map((invitation) => {
					const inviter = users.data.find((u) => u.id === invitation.invitedBy)
					return {
						...invitation,
						inviterName: inviter
							? `${inviter.firstName} ${inviter.lastName}`.trim() ||
								inviter.username ||
								'Unknown User'
							: 'Unknown User'
					}
				})
			} catch (error) {
				console.error('Failed to fetch user or invitations:', error)
				return []
			}
		}),

	accept: protectedProcedure
		.input(z.object({ invitationId: z.string(), userId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const { invitationId, userId } = input

			const invitation = await ctx.prisma.invitation.findUnique({
				where: { id: invitationId }
			})

			if (!invitation || invitation.status !== 'PENDING') {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: i18n.t('invitations.notFoundOrInvalid')
				})
			}

			try {
				const user = await clerkClient.users.getUser(userId)
				const email = user.emailAddresses.find(
					(e) => e.id === user.primaryEmailAddressId
				)?.emailAddress

				if (invitation.email !== email) {
					throw new TRPCError({
						code: 'FORBIDDEN',
						message: i18n.t('invitations.notForYou')
					})
				}
			} catch (error) {
				console.error('Clerk verification failed:', error)
				// Fallback or fail? stricter security says fail.
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: i18n.t('server.error.identityVerification')
				})
			}

			const existingMembership = await ctx.prisma.householdUser.findUnique({
				where: {
					userId_householdId: {
						userId,
						householdId: invitation.householdId
					}
				}
			})

			if (existingMembership) {
				return ctx.prisma.invitation.update({
					where: { id: invitationId },
					data: { status: 'ACCEPTED' }
				})
			}

			return ctx.prisma.$transaction([
				ctx.prisma.householdUser.create({
					data: {
						userId,
						householdId: invitation.householdId
					}
				}),
				ctx.prisma.invitation.update({
					where: { id: invitationId },
					data: { status: 'ACCEPTED' }
				})
			])
		}),

	decline: protectedProcedure
		.input(z.object({ invitationId: z.string(), userId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const { invitationId, userId } = input

			const invitation = await ctx.prisma.invitation.findUnique({
				where: { id: invitationId }
			})

			if (!invitation || invitation.status !== 'PENDING') {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: i18n.t('invitations.notFound')
				})
			}

			// Verify user owns this invitation
			try {
				const user = await clerkClient.users.getUser(userId)
				const email = user.emailAddresses.find(
					(e) => e.id === user.primaryEmailAddressId
				)?.emailAddress

				if (invitation.email !== email) {
					throw new TRPCError({
						code: 'FORBIDDEN',
						message: i18n.t('invitations.notForYou')
					})
				}
			} catch (error) {
				console.error('Clerk verification failed:', error)
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: i18n.t('server.error.identityVerification')
				})
			}

			return ctx.prisma.invitation.update({
				where: { id: invitationId },
				data: { status: 'DECLINED' }
			})
		}),

	revoke: protectedProcedure
		.input(z.object({ invitationId: z.string(), userId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const { invitationId, userId } = input

			const invitation = await ctx.prisma.invitation.findUnique({
				where: { id: invitationId }
			})

			if (!invitation) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: i18n.t('invitations.notFound')
				})
			}

			const membership = await ctx.prisma.householdUser.findUnique({
				where: {
					userId_householdId: {
						userId,
						householdId: invitation.householdId
					}
				}
			})

			if (!membership) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: i18n.t('invitations.revokePermissionError')
				})
			}

			return ctx.prisma.invitation.delete({
				where: { id: invitationId }
			})
		}),

	listByHousehold: protectedProcedure
		.input(z.object({ householdId: z.string(), userId: z.string() }))
		.query(async ({ ctx, input }) => {
			const { householdId, userId } = input

			const membership = await ctx.prisma.householdUser.findUnique({
				where: {
					userId_householdId: {
						userId,
						householdId
					}
				}
			})

			if (!membership) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: i18n.t('households.userNotMember')
				})
			}

			return ctx.prisma.invitation.findMany({
				where: {
					householdId,
					status: 'PENDING'
				}
			})
		})
} satisfies TRPCRouterRecord
