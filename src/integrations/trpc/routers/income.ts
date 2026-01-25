/**
 * Income tRPC Router
 * Handles managed recurring income
 */

import type { TRPCRouterRecord } from '@trpc/server'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { RecurrenceType } from '../../../generated/prisma/enums'
import { protectedProcedure } from '../init'

export const incomeRouter = {
	/**
	 * List all incomes for a budget
	 */
	list: protectedProcedure
		.input(
			z.object({
				budgetId: z.string(),
				userId: z.string(),
				includeArchived: z.boolean().default(false)
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

			return ctx.prisma.income.findMany({
				where: {
					budgetId: input.budgetId,
					...(input.includeArchived ? {} : { isArchived: false })
				},
				orderBy: {
					expectedDate: 'asc'
				},
				include: {
					category: true,
					account: true
				}
			})
		}),

	/**
	 * Get income by ID
	 */
	getById: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				userId: z.string()
			})
		)
		.query(async ({ ctx, input }) => {
			const income = await ctx.prisma.income.findUnique({
				where: { id: input.id },
				include: {
					category: true,
					account: true,
					budget: true
				}
			})

			if (!income) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Income not found'
				})
			}

			// Verify access
			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: income.budget.householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'You do not have access to this income'
				})
			}

			return income
		}),

	/**
	 * Create new income
	 */
	create: protectedProcedure
		.input(
			z.object({
				budgetId: z.string(),
				userId: z.string(),
				name: z.string().min(1, 'Name is required'),
				source: z.string().min(1, 'Source is required'),
				amount: z.number().positive('Amount must be positive'),
				expectedDate: z.date(),
				accountId: z.string(),
				categoryId: z.string().optional(),
				recurrenceType: z.nativeEnum(RecurrenceType),
				customIntervalDays: z.number().optional().nullable(),
				endDate: z.date().optional().nullable(),
				// Ability to create new category inline
				newCategoryName: z.string().optional()
			})
		)
		.mutation(async ({ ctx, input }) => {
			// Verify budget and access
			const budget = await ctx.prisma.budget.findUnique({
				where: { id: input.budgetId }
			})

			if (!budget) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Budget not found'
				})
			}

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

			// Validate category
			let finalCategoryId: string

			if (input.newCategoryName) {
				// Create new INCOME category
				const newCategory = await ctx.prisma.category.create({
					data: {
						name: input.newCategoryName,
						type: 'INCOME', // Always INCOME for Income model
						householdId: budget.householdId,
						budgets: {
							create: {
								budgetId: input.budgetId
							}
						}
					}
				})
				finalCategoryId = newCategory.id
			} else if (input.categoryId) {
				// Check if category exists and is linked
				const categoryLink = await ctx.prisma.budgetCategory.findFirst({
					where: {
						budgetId: input.budgetId,
						categoryId: input.categoryId
					}
				})

				if (!categoryLink) {
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'Category is not linked to this budget'
					})
				}
				finalCategoryId = input.categoryId
			} else {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'Category or new category name is required'
				})
			}

			// Validate account
			const accountLink = await ctx.prisma.budgetAccount.findFirst({
				where: {
					budgetId: input.budgetId,
					accountId: input.accountId
				}
			})

			if (!accountLink) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'Account is not linked to this budget'
				})
			}

			return ctx.prisma.income.create({
				data: {
					name: input.name,
					source: input.source,
					estimatedAmount: input.amount,
					expectedDate: input.expectedDate,
					accountId: input.accountId,
					categoryId: finalCategoryId,
					budgetId: input.budgetId,
					recurrenceType: input.recurrenceType,
					customIntervalDays: input.customIntervalDays,
					endDate: input.endDate
				},
				include: {
					category: true,
					account: true
				}
			})
		}),

	/**
	 * Update income
	 */
	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				userId: z.string(),
				name: z.string().min(1).optional(),
				source: z.string().min(1).optional(),
				amount: z.number().positive().optional(),
				expectedDate: z.date().optional(),
				accountId: z.string().optional(),
				categoryId: z.string().optional(),
				recurrenceType: z.nativeEnum(RecurrenceType).optional(),
				customIntervalDays: z.number().optional().nullable(),
				endDate: z.date().optional().nullable()
			})
		)
		.mutation(async ({ ctx, input }) => {
			const income = await ctx.prisma.income.findUnique({
				where: { id: input.id },
				include: { budget: true }
			})

			if (!income) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Income not found'
				})
			}

			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: income.budget.householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'You do not have access to this income'
				})
			}

			// If changing category
			if (input.categoryId) {
				const categoryLink = await ctx.prisma.budgetCategory.findFirst({
					where: {
						budgetId: income.budgetId,
						categoryId: input.categoryId
					}
				})
				if (!categoryLink) {
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'Category not linked to budget'
					})
				}
			}

			// If changing account
			if (input.accountId) {
				const accountLink = await ctx.prisma.budgetAccount.findFirst({
					where: {
						budgetId: income.budgetId,
						accountId: input.accountId
					}
				})
				if (!accountLink) {
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'Account not linked to budget'
					})
				}
			}

			return ctx.prisma.income.update({
				where: { id: input.id },
				data: {
					name: input.name,
					source: input.source,
					estimatedAmount: input.amount,
					expectedDate: input.expectedDate,
					accountId: input.accountId,
					categoryId: input.categoryId,
					recurrenceType: input.recurrenceType,
					customIntervalDays: input.customIntervalDays,
					endDate: input.endDate
				},
				include: {
					category: true,
					account: true
				}
			})
		}),

	/**
	 * Delete income
	 */
	delete: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				userId: z.string()
			})
		)
		.mutation(async ({ ctx, input }) => {
			const income = await ctx.prisma.income.findUnique({
				where: { id: input.id },
				include: { budget: true }
			})

			if (!income) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Income not found'
				})
			}

			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: income.budget.householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'You do not have access to this income'
				})
			}

			await ctx.prisma.income.delete({
				where: { id: input.id }
			})

			return { success: true }
		}),

	/**
	 * Archive/Unarchive income
	 */
	archive: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				userId: z.string(),
				isArchived: z.boolean()
			})
		)
		.mutation(async ({ ctx, input }) => {
			const income = await ctx.prisma.income.findUnique({
				where: { id: input.id },
				include: { budget: true }
			})

			if (!income) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Income not found'
				})
			}

			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: income.budget.householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'You do not have access to this income'
				})
			}

			return ctx.prisma.income.update({
				where: { id: input.id },
				data: { isArchived: input.isArchived }
			})
		})
} satisfies TRPCRouterRecord
