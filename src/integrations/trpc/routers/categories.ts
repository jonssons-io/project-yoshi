import type { TRPCRouterRecord } from '@trpc/server'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import i18n from '@/lib/i18n'
import { protectedProcedure } from '../init'

/**
 * Category router for managing income/expense categories
 * Categories are household-level, shared across all household members
 */
export const categoriesRouter = {
	/**
	 * List all categories for a household
	 */
	list: protectedProcedure
		.input(
			z.object({
				householdId: z.string(),
				userId: z.string(),
				type: z.enum(['INCOME', 'EXPENSE']).optional(),
				budgetId: z.string().optional()
			})
		)
		.query(async ({ ctx, input }) => {
			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: input.householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: i18n.t('server.forbidden.householdAccess')
				})
			}

			return ctx.prisma.category.findMany({
				where: {
					householdId: input.householdId,
					...(input.type && {
						types: {
							has: input.type
						}
					}),
					...(input.budgetId && {
						budgets: {
							some: {
								budgetId: input.budgetId
							}
						}
					})
				},
				orderBy: {
					name: 'asc'
				},
				include: {
					_count: {
						select: {
							transactions: true,
							budgets: true
						}
					}
				}
			})
		}),

	getById: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				userId: z.string()
			})
		)
		.query(async ({ ctx, input }) => {
			const category = await ctx.prisma.category.findUnique({
				where: { id: input.id },
				include: {
					household: true,
					budgets: {
						select: {
							budgetId: true
						}
					},
					_count: {
						select: {
							transactions: true,
							budgets: true
						}
					}
				}
			})

			if (!category) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: i18n.t('categories.notFound')
				})
			}

			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: category.householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: i18n.t('server.forbidden.categoryAccess')
				})
			}

			return category
		}),

	create: protectedProcedure
		.input(
			z.object({
				householdId: z.string(),
				userId: z.string(),
				name: z.string().min(1, i18n.t('validation.nameRequired')),
				types: z
					.array(z.enum(['INCOME', 'EXPENSE']))
					.min(1, i18n.t('categories.atleastOneTypeRequired')),
				budgetIds: z.array(z.string()).optional()
			})
		)
		.mutation(async ({ ctx, input }) => {
			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: input.householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: i18n.t('server.forbidden.householdAccess')
				})
			}

			let budgetIdsToLink = input.budgetIds

			if (budgetIdsToLink === undefined) {
				const budgets = await ctx.prisma.budget.findMany({
					where: {
						householdId: input.householdId
					},
					select: {
						id: true
					}
				})
				budgetIdsToLink = budgets.map((b) => b.id)
			}

			return ctx.prisma.category.create({
				data: {
					name: input.name,
					types: input.types,
					householdId: input.householdId,
					...(budgetIdsToLink.length > 0 && {
						budgets: {
							create: budgetIdsToLink.map((budgetId) => ({
								budgetId
							}))
						}
					})
				},
				include: {
					_count: {
						select: {
							budgets: true
						}
					}
				}
			})
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				userId: z.string(),
				name: z.string().min(1, i18n.t('validation.nameRequired')).optional(),
				types: z
					.array(z.enum(['INCOME', 'EXPENSE']))
					.min(1)
					.optional(),
				budgetIds: z.array(z.string()).optional()
			})
		)
		.mutation(async ({ ctx, input }) => {
			const category = await ctx.prisma.category.findUnique({
				where: { id: input.id },
				include: {
					budgets: true
				}
			})

			if (!category) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: i18n.t('categories.notFound')
				})
			}

			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: category.householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: i18n.t('server.forbidden.categoryAccess')
				})
			}

			const budgetOperations: any = {}

			if (input.budgetIds !== undefined) {
				const currentBudgetIds = category.budgets.map((b) => b.budgetId)
				const newBudgetIds = input.budgetIds

				const toAdd = newBudgetIds.filter(
					(id) => !currentBudgetIds.includes(id)
				)
				const toRemove = currentBudgetIds.filter(
					(id) => !newBudgetIds.includes(id)
				)

				if (toRemove.length > 0) {
					budgetOperations.deleteMany = {
						budgetId: { in: toRemove }
					}
				}
				if (toAdd.length > 0) {
					budgetOperations.create = toAdd.map((budgetId) => ({ budgetId }))
				}
			}

			return ctx.prisma.category.update({
				where: { id: input.id },
				data: {
					name: input.name,
					types: input.types,
					...(Object.keys(budgetOperations).length > 0 && {
						budgets: budgetOperations
					})
				},
				include: {
					_count: {
						select: {
							budgets: true
						}
					}
				}
			})
		}),

	/**
	 * Delete a category
	 * Note: This will fail if there are transactions using this category (Restrict)
	 */
	delete: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				userId: z.string() // For access verification
			})
		)
		.mutation(async ({ ctx, input }) => {
			const category = await ctx.prisma.category.findUnique({
				where: { id: input.id },
				include: {
					_count: {
						select: {
							transactions: true
						}
					}
				}
			})

			if (!category) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: i18n.t('categories.notFound')
				})
			}

			// Verify user has access to this household
			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: category.householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: i18n.t('server.forbidden.categoryAccess')
				})
			}

			if (category._count.transactions > 0) {
				throw new TRPCError({
					code: 'PRECONDITION_FAILED',
					message: i18n.t('categories.deleteErrorCount', {
						count: category._count.transactions
					})
				})
			}

			await ctx.prisma.category.delete({
				where: { id: input.id }
			})

			return { success: true }
		})
} satisfies TRPCRouterRecord
