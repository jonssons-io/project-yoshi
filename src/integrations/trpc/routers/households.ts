import { createClerkClient } from '@clerk/backend'
import type { TRPCRouterRecord } from '@trpc/server'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure } from '../init'

const clerkClient = createClerkClient({
	secretKey: process.env.CLERK_SECRET_KEY
})

/**
 * Household router for managing households and household members
 */
export const householdsRouter = {
	/**
	 * List all households for the authenticated user
	 */
	list: protectedProcedure
		.input(
			z.object({
				userId: z.string()
			})
		)
		.query(async ({ ctx, input }) => {
			const householdUsers = await ctx.prisma.householdUser.findMany({
				where: {
					userId: input.userId
				},
				include: {
					household: {
						include: {
							_count: {
								select: {
									users: true,
									budgets: true,
									categories: true,
									accounts: true
								}
							}
						}
					}
				},
				orderBy: {
					joinedAt: 'desc'
				}
			})

			return householdUsers.map((hu) => hu.household)
		}),

	/**
	 * Get a specific household by ID
	 */
	getById: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				userId: z.string()
			})
		)
		.query(async ({ ctx, input }) => {
			// Verify user has access to this household
			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: input.id,
					userId: input.userId
				},
				include: {
					household: {
						include: {
							users: true,
							_count: {
								select: {
									budgets: true,
									categories: true,
									accounts: true
								}
							}
						}
					}
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Household not found or you do not have access'
				})
			}

			return householdUser.household
		}),

	/**
	 * Create a new household
	 */
	create: protectedProcedure
		.input(
			z.object({
				userId: z.string(),
				name: z.string().min(1, 'Name is required')
			})
		)
		.mutation(async ({ ctx, input }) => {
			// Create household and add user as member in a transaction
			const household = await ctx.prisma.household.create({
				data: {
					name: input.name,
					users: {
						create: {
							userId: input.userId
						}
					}
				},
				include: {
					users: true,
					_count: {
						select: {
							budgets: true,
							categories: true,
							accounts: true
						}
					}
				}
			})

			return household
		}),

	/**
	 * Update a household
	 */
	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				userId: z.string(),
				name: z.string().min(1, 'Name is required').optional()
			})
		)
		.mutation(async ({ ctx, input }) => {
			// Verify user has access
			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: input.id,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Household not found or you do not have access'
				})
			}

			return ctx.prisma.household.update({
				where: { id: input.id },
				data: {
					name: input.name
				}
			})
		}),

	/**
	 * Delete a household
	 */
	delete: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				userId: z.string()
			})
		)
		.mutation(async ({ ctx, input }) => {
			// Verify user has access
			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: input.id,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Household not found or you do not have access'
				})
			}

			// Check if there are any budgets (optional safety check)
			const budgetCount = await ctx.prisma.budget.count({
				where: { householdId: input.id }
			})

			if (budgetCount > 0) {
				throw new TRPCError({
					code: 'PRECONDITION_FAILED',
					message: `Cannot delete household with ${budgetCount} budget(s). Please delete all budgets first.`
				})
			}

			return ctx.prisma.household.delete({
				where: { id: input.id }
			})
		}),

	/**
	 * Add a user to a household
	 */
	addUser: protectedProcedure
		.input(
			z.object({
				householdId: z.string(),
				userId: z.string(), // The current user (must be in household)
				newUserId: z.string() // The user to add
			})
		)
		.mutation(async ({ ctx, input }) => {
			// Verify requesting user has access
			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: input.householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'You do not have access to this household'
				})
			}

			// Check if new user is already in household
			const existing = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: input.householdId,
					userId: input.newUserId
				}
			})

			if (existing) {
				throw new TRPCError({
					code: 'CONFLICT',
					message: 'User is already a member of this household'
				})
			}

			// Add new user
			return ctx.prisma.householdUser.create({
				data: {
					householdId: input.householdId,
					userId: input.newUserId
				},
				include: {
					household: true
				}
			})
		}),

	/**
	 * Remove a user from a household
	 */
	removeUser: protectedProcedure
		.input(
			z.object({
				householdId: z.string(),
				userId: z.string(), // The current user (must be in household)
				removeUserId: z.string() // The user to remove
			})
		)
		.mutation(async ({ ctx, input }) => {
			// Verify requesting user has access
			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: input.householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'You do not have access to this household'
				})
			}

			// Check if this would remove the last user
			const userCount = await ctx.prisma.householdUser.count({
				where: { householdId: input.householdId }
			})

			if (userCount <= 1) {
				throw new TRPCError({
					code: 'PRECONDITION_FAILED',
					message:
						'Cannot remove the last user from a household. Delete the household instead.'
				})
			}

			// Find the household user record to delete
			const targetUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: input.householdId,
					userId: input.removeUserId
				}
			})

			if (!targetUser) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'User is not a member of this household'
				})
			}

			return ctx.prisma.householdUser.delete({
				where: { id: targetUser.id }
			})
		}),

	/**
	 * Get members of a household
	 */
	getMembers: protectedProcedure
		.input(
			z.object({
				householdId: z.string(),
				userId: z.string()
			})
		)
		.query(async ({ ctx, input }) => {
			// Verify access
			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: input.householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'You do not have access to this household'
				})
			}

			// Get all members
			const members = await ctx.prisma.householdUser.findMany({
				where: {
					householdId: input.householdId
				}
			})

			const userIds = members.map((m) => m.userId)

			try {
				const clerkUsers = await clerkClient.users.getUserList({
					userId: userIds,
					limit: 100
				})

				return members.map((member) => {
					const user = clerkUsers.data.find(
						(u: { id: string }) => u.id === member.userId
					)
					return {
						...member,
						user: user
							? {
									id: user.id,
									firstName: user.firstName,
									lastName: user.lastName,
									fullName: `${user.firstName} ${user.lastName}`.trim(),
									imageUrl: user.imageUrl,
									email: user.emailAddresses.find(
										(e: { id: string }) => e.id === user.primaryEmailAddressId
									)?.emailAddress
								}
							: null
					}
				})
			} catch (error) {
				console.error('Failed to fetch users from Clerk:', error)
				// Return members without user details if Clerk fails
				return members.map((member) => ({
					...member,
					user: null
				}))
			}
		})
} satisfies TRPCRouterRecord
