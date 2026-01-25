import type { TRPCRouterRecord } from '@trpc/server'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure } from '../init'

/**
 * Account router for managing financial accounts
 * Accounts are household-level, shared across all household members
 */
export const accountsRouter = {
	/**
	 * List all accounts for a household
	 */
	list: protectedProcedure
		.input(
			z.object({
				householdId: z.string(),
				userId: z.string(), // For access verification
				budgetId: z.string().optional(), // Optional: filter by budget linkage
				excludeArchived: z.boolean().optional()
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

			return ctx.prisma.account.findMany({
				where: {
					householdId: input.householdId,
					// If budgetId provided, only return accounts linked to that budget
					...(input.budgetId && {
						budgets: {
							some: {
								budgetId: input.budgetId
							}
						}
					}),
					...(input.excludeArchived && {
						isArchived: false
					})
				},
				orderBy: {
					createdAt: 'desc'
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
	 * Get a specific account by ID
	 */
	getById: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				userId: z.string() // For access verification
			})
		)
		.query(async ({ ctx, input }) => {
			const account = await ctx.prisma.account.findUnique({
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

			if (!account) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Account not found'
				})
			}

			// Verify user has access to this household
			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: account.householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'You do not have access to this account'
				})
			}

			return account
		}),

	/**
	 * Get current balance for an account
	 * Balance = initialBalance + sum of all transactions up to today
	 */
	getBalance: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				userId: z.string(), // For access verification
				asOfDate: z.date().optional()
			})
		)
		.query(async ({ ctx, input }) => {
			const account = await ctx.prisma.account.findUnique({
				where: { id: input.id }
			})

			if (!account) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Account not found'
				})
			}

			// Verify user has access to this household
			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: account.householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'You do not have access to this account'
				})
			}

			const asOfDate = input.asOfDate || new Date()

			// Get all transactions up to the specified date
			const transactions = await ctx.prisma.transaction.findMany({
				where: {
					accountId: input.id,
					date: {
						lte: asOfDate
					}
				},
				include: {
					category: true
				}
			})

			// Get transfers
			const transfersFrom = await ctx.prisma.transfer.findMany({
				where: {
					fromAccountId: input.id,
					date: { lte: asOfDate }
				}
			})

			const transfersTo = await ctx.prisma.transfer.findMany({
				where: {
					toAccountId: input.id,
					date: { lte: asOfDate }
				}
			})

			// Calculate balance: initial + income - expenses
			const transactionTotal = transactions.reduce((sum, transaction) => {
				if (transaction.category.type === 'INCOME') {
					return sum + transaction.amount
				}
				return sum - transaction.amount
			}, 0)

			const transfersOutTotal = transfersFrom.reduce(
				(sum, t) => sum + t.amount,
				0
			)
			const transfersInTotal = transfersTo.reduce((sum, t) => sum + t.amount, 0)

			const currentBalance =
				account.initialBalance +
				transactionTotal -
				transfersOutTotal +
				transfersInTotal

			return {
				accountId: account.id,
				accountName: account.name,
				initialBalance: account.initialBalance,
				transactionTotal,
				currentBalance,
				asOfDate,
				transactionCount: transactions.length
			}
		}),

	/**
	 * Create a new account
	 */
	create: protectedProcedure
		.input(
			z.object({
				householdId: z.string(),
				userId: z.string(), // For access verification
				name: z.string().min(1, 'Name is required'),
				externalIdentifier: z.string().optional(),
				initialBalance: z.number().default(0),
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

			// Create account and link to specified budgets (can be empty array for orphaned)
			return ctx.prisma.account.create({
				data: {
					name: input.name,
					externalIdentifier: input.externalIdentifier,
					initialBalance: input.initialBalance,
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
	 * Update an account
	 */
	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				userId: z.string(), // For access verification
				name: z.string().min(1, 'Name is required').optional(),
				externalIdentifier: z.string().nullable().optional(),
				initialBalance: z.number().optional(),
				budgetIds: z.array(z.string()).optional() // Optional: update budget links
			})
		)
		.mutation(async ({ ctx, input }) => {
			const account = await ctx.prisma.account.findUnique({
				where: { id: input.id },
				include: {
					budgets: true
				}
			})

			if (!account) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Account not found'
				})
			}

			// Verify user has access to this household
			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: account.householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'You do not have access to this account'
				})
			}

			// If budgetIds provided, sync budget links
			if (input.budgetIds !== undefined) {
				const currentBudgetIds = account.budgets.map((b) => b.budgetId)
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

				// Update account with new budget links
				return ctx.prisma.account.update({
					where: { id: input.id },
					data: {
						name: input.name,
						externalIdentifier: input.externalIdentifier,
						initialBalance: input.initialBalance,
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
			return ctx.prisma.account.update({
				where: { id: input.id },
				data: {
					name: input.name,
					externalIdentifier: input.externalIdentifier,
					initialBalance: input.initialBalance
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
	 * Delete an account
	 * Note: This will fail if there are transactions using this account (Restrict)
	 */
	delete: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				userId: z.string() // For access verification
			})
		)
		.mutation(async ({ ctx, input }) => {
			const account = await ctx.prisma.account.findUnique({
				where: { id: input.id },
				include: {
					_count: {
						select: {
							transactions: true
						}
					}
				}
			})

			if (!account) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Account not found'
				})
			}

			// Verify user has access to this household
			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: account.householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Account not found'
				})
			}

			const transactionCount = account._count.transactions
			const billCount = await ctx.prisma.bill.count({
				where: { accountId: input.id }
			})
			const incomeCount = await ctx.prisma.income.count({
				where: { accountId: input.id }
			})
			const transferFromCount = await ctx.prisma.transfer.count({
				where: { fromAccountId: input.id }
			})
			const transferToCount = await ctx.prisma.transfer.count({
				where: { toAccountId: input.id }
			})

			if (
				transactionCount > 0 ||
				billCount > 0 ||
				incomeCount > 0 ||
				transferFromCount > 0 ||
				transferToCount > 0
			) {
				throw new TRPCError({
					code: 'PRECONDITION_FAILED',
					message:
						'Cannot delete account with existing transactions, bills, or transfers. Please archive it instead.'
				})
			}

			await ctx.prisma.account.delete({
				where: { id: input.id }
			})

			return { success: true }
		}),

	/**
	 * Toggle archive status of an account
	 */
	toggleArchive: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				userId: z.string(),
				isArchived: z.boolean()
			})
		)
		.mutation(async ({ ctx, input }) => {
			const account = await ctx.prisma.account.findUnique({
				where: { id: input.id }
			})

			if (!account) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Account not found'
				})
			}

			// Verify user has access to this household
			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: account.householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'You do not have access to this account'
				})
			}

			return ctx.prisma.account.update({
				where: { id: input.id },
				data: { isArchived: input.isArchived }
			})
		})
} satisfies TRPCRouterRecord
