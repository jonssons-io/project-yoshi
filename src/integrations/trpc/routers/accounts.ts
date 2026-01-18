import { z } from 'zod'
import { protectedProcedure } from '../init'
import { TRPCError } from '@trpc/server'

import type { TRPCRouterRecord } from '@trpc/server'

/**
 * Account router for managing financial accounts
 */
export const accountsRouter = {
  /**
   * List all accounts for a budget
   */
  list: protectedProcedure
    .input(
      z.object({
        budgetId: z.string(),
        userId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify budget ownership
      const budget = await ctx.prisma.budget.findFirst({
        where: {
          id: input.budgetId,
          userId: input.userId,
        },
      })

      if (!budget) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Budget not found',
        })
      }

      return ctx.prisma.account.findMany({
        where: {
          budgetId: input.budgetId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          _count: {
            select: {
              transactions: true,
            },
          },
        },
      })
    }),

  /**
   * Get a specific account by ID
   */
  getById: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        userId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const account = await ctx.prisma.account.findFirst({
        where: {
          id: input.id,
          budget: {
            userId: input.userId,
          },
        },
        include: {
          budget: true,
          _count: {
            select: {
              transactions: true,
            },
          },
        },
      })

      if (!account) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Account not found',
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
        userId: z.string(),
        asOfDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const account = await ctx.prisma.account.findFirst({
        where: {
          id: input.id,
          budget: {
            userId: input.userId,
          },
        },
      })

      if (!account) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Account not found',
        })
      }

      const asOfDate = input.asOfDate || new Date()

      // Get all transactions up to the specified date
      const transactions = await ctx.prisma.transaction.findMany({
        where: {
          accountId: input.id,
          date: {
            lte: asOfDate,
          },
        },
        include: {
          category: true,
        },
      })

      // Calculate balance: initial + income - expenses
      const transactionTotal = transactions.reduce((sum, transaction) => {
        if (transaction.category.type === 'INCOME') {
          return sum + transaction.amount
        }
        return sum - transaction.amount
      }, 0)

      const currentBalance = account.initialBalance + transactionTotal

      return {
        accountId: account.id,
        accountName: account.name,
        initialBalance: account.initialBalance,
        transactionTotal,
        currentBalance,
        asOfDate,
        transactionCount: transactions.length,
      }
    }),

  /**
   * Create a new account
   */
  create: protectedProcedure
    .input(
      z.object({
        budgetId: z.string(),
        userId: z.string(),
        name: z.string().min(1, 'Name is required'),
        externalIdentifier: z.string().optional(),
        initialBalance: z.number().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify budget ownership
      const budget = await ctx.prisma.budget.findFirst({
        where: {
          id: input.budgetId,
          userId: input.userId,
        },
      })

      if (!budget) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Budget not found',
        })
      }

      return ctx.prisma.account.create({
        data: {
          name: input.name,
          externalIdentifier: input.externalIdentifier,
          initialBalance: input.initialBalance,
          budgetId: input.budgetId,
        },
      })
    }),

  /**
   * Update an account
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        userId: z.string(),
        name: z.string().min(1, 'Name is required').optional(),
        externalIdentifier: z.string().nullable().optional(),
        initialBalance: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership through budget
      const account = await ctx.prisma.account.findFirst({
        where: {
          id: input.id,
          budget: {
            userId: input.userId,
          },
        },
      })

      if (!account) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Account not found',
        })
      }

      return ctx.prisma.account.update({
        where: { id: input.id },
        data: {
          name: input.name,
          externalIdentifier: input.externalIdentifier,
          initialBalance: input.initialBalance,
        },
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
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership through budget
      const account = await ctx.prisma.account.findFirst({
        where: {
          id: input.id,
          budget: {
            userId: input.userId,
          },
        },
        include: {
          _count: {
            select: {
              transactions: true,
            },
          },
        },
      })

      if (!account) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Account not found',
        })
      }

      if (account._count.transactions > 0) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `Cannot delete account with ${account._count.transactions} transactions. Please reassign or delete transactions first.`,
        })
      }

      await ctx.prisma.account.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),
} satisfies TRPCRouterRecord
