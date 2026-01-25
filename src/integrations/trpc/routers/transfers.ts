/**
 * Transfers tRPC Router
 * Handles fund transfers between accounts within the same budget
 *
 * A transfer moves money from one account to another:
 * - From account balance decreases
 * - To account balance increases
 * - Both accounts must be linked to the same budget
 */

import type { TRPCRouterRecord } from '@trpc/server'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure } from '../init'

export const transfersRouter = {
	/**
	 * List all transfers for a budget
	 */
	list: protectedProcedure
		.input(
			z.object({
				budgetId: z.string(),
				userId: z.string(),
				dateFrom: z.date().optional(),
				dateTo: z.date().optional()
			})
		)
		.query(async ({ ctx, input }) => {
			// Verify budget exists and user has access
			const budget = await ctx.prisma.budget.findUnique({
				where: { id: input.budgetId }
			})

			if (!budget) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Budget not found'
				})
			}

			// Verify user has access to this household
			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: budget.householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'You do not have access to this budget'
				})
			}

			return ctx.prisma.transfer.findMany({
				where: {
					budgetId: input.budgetId,
					...(input.dateFrom || input.dateTo
						? {
								date: {
									...(input.dateFrom && { gte: input.dateFrom }),
									...(input.dateTo && { lte: input.dateTo })
								}
							}
						: {})
				},
				orderBy: {
					date: 'desc'
				},
				include: {
					fromAccount: true,
					toAccount: true
				}
			})
		}),

	/**
	 * Create a new transfer between accounts
	 */
	create: protectedProcedure
		.input(
			z.object({
				budgetId: z.string(),
				userId: z.string(),
				fromAccountId: z.string(),
				toAccountId: z.string(),
				amount: z.number().positive('Amount must be positive'),
				date: z.date(),
				notes: z.string().optional()
			})
		)
		.mutation(async ({ ctx, input }) => {
			// Verify budget exists and user has access
			const budget = await ctx.prisma.budget.findUnique({
				where: { id: input.budgetId }
			})

			if (!budget) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Budget not found'
				})
			}

			// Verify user has access to this household
			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: budget.householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'You do not have access to this budget'
				})
			}

			// Verify both accounts are linked to this budget
			const fromAccountLink = await ctx.prisma.budgetAccount.findFirst({
				where: {
					budgetId: input.budgetId,
					accountId: input.fromAccountId
				}
			})

			if (!fromAccountLink) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'Source account is not linked to this budget'
				})
			}

			const toAccountLink = await ctx.prisma.budgetAccount.findFirst({
				where: {
					budgetId: input.budgetId,
					accountId: input.toAccountId
				}
			})

			if (!toAccountLink) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'Destination account is not linked to this budget'
				})
			}

			// Ensure accounts are different
			if (input.fromAccountId === input.toAccountId) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'Source and destination accounts must be different'
				})
			}

			return ctx.prisma.transfer.create({
				data: {
					fromAccountId: input.fromAccountId,
					toAccountId: input.toAccountId,
					amount: input.amount,
					date: input.date,
					notes: input.notes,
					budgetId: input.budgetId
				},
				include: {
					fromAccount: true,
					toAccount: true
				}
			})
		}),

	/**
	 * Update a transfer
	 */
	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				userId: z.string(),
				fromAccountId: z.string().optional(),
				toAccountId: z.string().optional(),
				amount: z.number().positive('Amount must be positive').optional(),
				date: z.date().optional(),
				notes: z.string().nullable().optional()
			})
		)
		.mutation(async ({ ctx, input }) => {
			// Get transfer with budget
			const transfer = await ctx.prisma.transfer.findUnique({
				where: { id: input.id },
				include: { budget: true }
			})

			if (!transfer) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Transfer not found'
				})
			}

			// Verify user has access to this household
			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: transfer.budget.householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Transfer not found'
				})
			}

			// If updating accounts, verify they're linked to the budget
			if (input.fromAccountId) {
				const fromAccountLink = await ctx.prisma.budgetAccount.findFirst({
					where: {
						budgetId: transfer.budgetId,
						accountId: input.fromAccountId
					}
				})

				if (!fromAccountLink) {
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'Source account is not linked to this budget'
					})
				}
			}

			if (input.toAccountId) {
				const toAccountLink = await ctx.prisma.budgetAccount.findFirst({
					where: {
						budgetId: transfer.budgetId,
						accountId: input.toAccountId
					}
				})

				if (!toAccountLink) {
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'Destination account is not linked to this budget'
					})
				}
			}

			// Ensure accounts are different if both are being updated
			const finalFromId = input.fromAccountId ?? transfer.fromAccountId
			const finalToId = input.toAccountId ?? transfer.toAccountId
			if (finalFromId === finalToId) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'Source and destination accounts must be different'
				})
			}

			return ctx.prisma.transfer.update({
				where: { id: input.id },
				data: {
					fromAccountId: input.fromAccountId,
					toAccountId: input.toAccountId,
					amount: input.amount,
					date: input.date,
					notes: input.notes
				},
				include: {
					fromAccount: true,
					toAccount: true
				}
			})
		}),

	/**
	 * Delete a transfer
	 */
	delete: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				userId: z.string()
			})
		)
		.mutation(async ({ ctx, input }) => {
			// Get transfer with budget
			const transfer = await ctx.prisma.transfer.findUnique({
				where: { id: input.id },
				include: { budget: true }
			})

			if (!transfer) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Transfer not found'
				})
			}

			// Verify user has access to this household
			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: transfer.budget.householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Transfer not found'
				})
			}

			await ctx.prisma.transfer.delete({
				where: { id: input.id }
			})

			return { success: true }
		})
} satisfies TRPCRouterRecord
