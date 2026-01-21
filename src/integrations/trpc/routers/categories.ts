import type { TRPCRouterRecord } from '@trpc/server'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
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
				userId: z.string(), // For access verification
				type: z.enum(['INCOME', 'EXPENSE']).optional(),
				budgetId: z.string().optional() // Optional: filter by budget linkage
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

			return ctx.prisma.category.findMany({
				where: {
					householdId: input.householdId,
					...(input.type && { type: input.type }),
					// If budgetId provided, only return categories linked to that budget
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

	/**
	 * Get a specific category by ID
	 */
	getById: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				userId: z.string() // For access verification
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
					message: 'Category not found'
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
					message: 'You do not have access to this category'
				})
			}

			return category
		}),

	/**
	 * Create a new category
	 */
	create: protectedProcedure
		.input(
			z.object({
				householdId: z.string(),
				userId: z.string(), // For access verification
				name: z.string().min(1, 'Name is required'),
				type: z.enum(['INCOME', 'EXPENSE']),
				budgetIds: z.array(z.string()).optional() // Optional: specific budgets to link (defaults to all)
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

			// Determine which budgets to link
			let budgetIdsToLink = input.budgetIds

			// If budgetIds not provided at all (undefined), default to all household budgets (opt-out model)
			// If budgetIds is an empty array [], it means user explicitly unchecked all (orphaned)
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

			// Create category and link to specified budgets (can be empty array for orphaned)
			return ctx.prisma.category.create({
				data: {
					name: input.name,
					type: input.type,
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

	/**
	 * Update a category
	 */
	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				userId: z.string(), // For access verification
				name: z.string().min(1, 'Name is required').optional(),
				type: z.enum(['INCOME', 'EXPENSE']).optional(),
				budgetIds: z.array(z.string()).optional() // Optional: update budget links
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
					message: 'Category not found'
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
					message: 'You do not have access to this category'
				})
			}

			// If budgetIds provided, sync budget links
			if (input.budgetIds !== undefined) {
				const currentBudgetIds = category.budgets.map((b) => b.budgetId)
				const newBudgetIds = input.budgetIds

				// Find budgets to add and remove
				const toAdd = newBudgetIds.filter(
					(id) => !currentBudgetIds.includes(id)
				)
				const toRemove = currentBudgetIds.filter(
					(id) => !newBudgetIds.includes(id)
				)

				// Build budget update operations
				const budgetOperations: any = {}
				if (toRemove.length > 0) {
					budgetOperations.deleteMany = {
						budgetId: { in: toRemove }
					}
				}
				if (toAdd.length > 0) {
					budgetOperations.create = toAdd.map((budgetId) => ({ budgetId }))
				}

				// Update category with new budget links
				return ctx.prisma.category.update({
					where: { id: input.id },
					data: {
						name: input.name,
						type: input.type,
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
			}

			// Regular update without budget changes
			return ctx.prisma.category.update({
				where: { id: input.id },
				data: {
					name: input.name,
					type: input.type
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
					message: 'Category not found'
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
					message: 'You do not have access to this category'
				})
			}

			if (category._count.transactions > 0) {
				throw new TRPCError({
					code: 'PRECONDITION_FAILED',
					message: `Cannot delete category with ${category._count.transactions} transactions. Please reassign or delete transactions first.`
				})
			}

			await ctx.prisma.category.delete({
				where: { id: input.id }
			})

			return { success: true }
		})
} satisfies TRPCRouterRecord
