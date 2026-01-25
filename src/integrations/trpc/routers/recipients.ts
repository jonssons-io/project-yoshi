/**
 * Recipients tRPC Router
 * Handles CRUD operations for recipients/senders
 *
 * Recipients are used for both:
 * - Expense Recipients (who receives the money)
 * - Income Senders (who sends the money)
 */

import type { TRPCRouterRecord } from '@trpc/server'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure } from '../init'

export const recipientsRouter = {
	/**
	 * List all recipients for a household
	 */
	list: protectedProcedure
		.input(
			z.object({
				householdId: z.string(),
				userId: z.string()
			})
		)
		.query(async ({ ctx, input }) => {
			// Verify user has access to this household
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

			return ctx.prisma.recipient.findMany({
				where: {
					householdId: input.householdId
				},
				orderBy: {
					name: 'asc'
				}
			})
		}),

	/**
	 * Get a recipient by ID
	 */
	getById: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				userId: z.string()
			})
		)
		.query(async ({ ctx, input }) => {
			const recipient = await ctx.prisma.recipient.findUnique({
				where: { id: input.id },
				include: {
					household: true
				}
			})

			if (!recipient) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Recipient not found'
				})
			}

			// Verify user has access to this household
			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: recipient.householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'You do not have access to this recipient'
				})
			}

			return recipient
		}),

	/**
	 * Get or create a recipient by name
	 * If recipient with name exists in household, returns existing one
	 * Otherwise creates a new recipient
	 */
	getOrCreate: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1, 'Recipient name is required'),
				householdId: z.string(),
				userId: z.string()
			})
		)
		.mutation(async ({ ctx, input }) => {
			// Verify user has access to this household
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

			// Try to find existing recipient
			const existingRecipient = await ctx.prisma.recipient.findUnique({
				where: {
					name_householdId: {
						name: input.name,
						householdId: input.householdId
					}
				}
			})

			if (existingRecipient) {
				return existingRecipient
			}

			// Create new recipient
			return ctx.prisma.recipient.create({
				data: {
					name: input.name,
					householdId: input.householdId
				}
			})
		}),

	/**
	 * Create a new recipient
	 */
	create: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1, 'Recipient name is required'),
				householdId: z.string(),
				userId: z.string()
			})
		)
		.mutation(async ({ ctx, input }) => {
			// Verify user has access to this household
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

			// Check if recipient with same name already exists
			const existingRecipient = await ctx.prisma.recipient.findUnique({
				where: {
					name_householdId: {
						name: input.name,
						householdId: input.householdId
					}
				}
			})

			if (existingRecipient) {
				throw new TRPCError({
					code: 'CONFLICT',
					message: 'A recipient with this name already exists'
				})
			}

			return ctx.prisma.recipient.create({
				data: {
					name: input.name,
					householdId: input.householdId
				}
			})
		}),

	/**
	 * Update a recipient
	 */
	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				userId: z.string(),
				name: z.string().min(1, 'Recipient name is required').optional()
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { id, userId, ...updateData } = input

			// Get recipient with household
			const recipient = await ctx.prisma.recipient.findUnique({
				where: { id }
			})

			if (!recipient) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Recipient not found'
				})
			}

			// Verify user has access to this household
			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: recipient.householdId,
					userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'You do not have access to this recipient'
				})
			}

			// If updating name, check for duplicates
			if (updateData.name) {
				const existingRecipient = await ctx.prisma.recipient.findFirst({
					where: {
						name: updateData.name,
						householdId: recipient.householdId,
						id: { not: id }
					}
				})

				if (existingRecipient) {
					throw new TRPCError({
						code: 'CONFLICT',
						message: 'A recipient with this name already exists'
					})
				}
			}

			return ctx.prisma.recipient.update({
				where: { id },
				data: updateData
			})
		}),

	/**
	 * Delete a recipient
	 */
	delete: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				userId: z.string()
			})
		)
		.mutation(async ({ ctx, input }) => {
			// Get recipient
			const recipient = await ctx.prisma.recipient.findUnique({
				where: { id: input.id }
			})

			if (!recipient) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Recipient not found'
				})
			}

			// Verify user has access to this household
			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: recipient.householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'You do not have access to this recipient'
				})
			}

			return ctx.prisma.recipient.delete({
				where: { id: input.id }
			})
		})
} satisfies TRPCRouterRecord
