import type { TRPCRouterRecord } from '@trpc/server'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import i18n from '@/lib/i18n'
import { protectedProcedure } from '../init'

export const allocationsRouter = {
	/**
	 * Create a new allocation (add funds to a budget)
	 */
	create: protectedProcedure
		.input(
			z.object({
				budgetId: z.string(),
				amount: z.number().positive(),
				userId: z.string()
			})
		)
		.mutation(async ({ ctx, input }) => {
			const budget = await ctx.prisma.budget.findUnique({
				where: { id: input.budgetId }
			})

			if (!budget) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: i18n.t('budgets.notFound')
				})
			}

			// Verify access
			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: budget.householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: i18n.t('server.forbidden.budgetAccess')
				})
			}

			// Create allocation
			return ctx.prisma.budgetAllocation.create({
				data: {
					amount: input.amount,
					budgetId: input.budgetId
				}
			})
		}),

	/**
	 * Transfer funds between budgets
	 */
	transfer: protectedProcedure
		.input(
			z.object({
				fromBudgetId: z.string(),
				toBudgetId: z.string(),
				amount: z.number().positive(),
				userId: z.string()
			})
		)
		.mutation(async ({ ctx, input }) => {
			const fromBudget = await ctx.prisma.budget.findUnique({
				where: { id: input.fromBudgetId }
			})
			const toBudget = await ctx.prisma.budget.findUnique({
				where: { id: input.toBudgetId }
			})

			if (!fromBudget || !toBudget) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: i18n.t('budgets.oneOrBothNotFound')
				})
			}

			if (fromBudget.householdId !== toBudget.householdId) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: i18n.t('budgets.mustBeSameHousehold')
				})
			}

			// Verify access
			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: fromBudget.householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: i18n.t('server.forbidden.budgetsAccess')
				})
			}

			// Perform transfer transactional
			return ctx.prisma.$transaction([
				ctx.prisma.budgetAllocation.create({
					data: {
						amount: -input.amount,
						budgetId: input.fromBudgetId
					}
				}),
				ctx.prisma.budgetAllocation.create({
					data: {
						amount: input.amount,
						budgetId: input.toBudgetId
					}
				})
			])
		}),

	/**
	 * Get total unallocated funds for a household
	 */
	getUnallocated: protectedProcedure
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
					message: i18n.t('server.forbidden.householdAccess')
				})
			}

			// Calculate Total Funds = Sum(Account Initial) + Sum(Income)
			const accounts = await ctx.prisma.account.findMany({
				where: { householdId: input.householdId },
				select: { initialBalance: true }
			})

			const totalInitial = accounts.reduce(
				(acc, curr) => acc + curr.initialBalance,
				0
			)

			// Get all income transactions
			// Since we want ALL income transactions that 'add to the pool',
			// this typically means all transactions of type INCOME in the household.
			// However, we must filter by 'INCOME' type.
			// Using aggregate for speed.
			const incomeAgg = await ctx.prisma.transaction.aggregate({
				where: {
					account: { householdId: input.householdId },
					category: {
						types: { has: 'INCOME' }
					}
				},
				_sum: {
					amount: true
				}
			})
			const totalIncome = incomeAgg._sum.amount ?? 0

			// Get all Allocations
			const allocationAgg = await ctx.prisma.budgetAllocation.aggregate({
				where: {
					budget: { householdId: input.householdId }
				},
				_sum: {
					amount: true
				}
			})
			const totalAllocated = allocationAgg._sum.amount ?? 0

			return {
				totalFunds: totalInitial + totalIncome,
				totalAllocated,
				unallocated: totalInitial + totalIncome - totalAllocated
			}
		})
} satisfies TRPCRouterRecord
