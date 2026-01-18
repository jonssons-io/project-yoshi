import { z } from 'zod'
import { protectedProcedure } from '../init'
import { TRPCError } from '@trpc/server'

import type { TRPCRouterRecord } from '@trpc/server'

/**
 * Transaction router for managing income/expense transactions
 */
export const transactionsRouter = {
  /**
   * List transactions with flexible filtering
   */
  list: protectedProcedure
    .input(
      z.object({
        budgetId: z.string(),
        userId: z.string(),
        accountId: z.string().optional(),
        categoryId: z.string().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        type: z.enum(['INCOME', 'EXPENSE']).optional(),
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

      return ctx.prisma.transaction.findMany({
        where: {
          budgetId: input.budgetId,
          ...(input.accountId && { accountId: input.accountId }),
          ...(input.categoryId && { categoryId: input.categoryId }),
          ...(input.type && {
            category: {
              type: input.type,
            },
          }),
          ...(input.dateFrom || input.dateTo
            ? {
                date: {
                  ...(input.dateFrom && { gte: input.dateFrom }),
                  ...(input.dateTo && { lte: input.dateTo }),
                },
              }
            : {}),
        },
        orderBy: {
          date: 'desc',
        },
        include: {
          category: true,
          account: true,
        },
      })
    }),

  /**
   * Get a specific transaction by ID
   */
  getById: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        userId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const transaction = await ctx.prisma.transaction.findFirst({
        where: {
          id: input.id,
          budget: {
            userId: input.userId,
          },
        },
        include: {
          category: true,
          account: true,
          budget: true,
        },
      })

      if (!transaction) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Transaction not found',
        })
      }

      return transaction
    }),

  /**
   * Get transactions grouped by category
   */
  groupedByCategory: protectedProcedure
    .input(
      z.object({
        budgetId: z.string(),
        userId: z.string(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        type: z.enum(['INCOME', 'EXPENSE']).optional(),
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

      const transactions = await ctx.prisma.transaction.findMany({
        where: {
          budgetId: input.budgetId,
          ...(input.type && {
            category: {
              type: input.type,
            },
          }),
          ...(input.dateFrom || input.dateTo
            ? {
                date: {
                  ...(input.dateFrom && { gte: input.dateFrom }),
                  ...(input.dateTo && { lte: input.dateTo }),
                },
              }
            : {}),
        },
        include: {
          category: true,
        },
        orderBy: {
          date: 'desc',
        },
      })

      // Group by category
      const grouped = transactions.reduce(
        (acc, transaction) => {
          const categoryId = transaction.categoryId
          if (!acc[categoryId]) {
            acc[categoryId] = {
              category: transaction.category,
              transactions: [],
              total: 0,
              count: 0,
            }
          }
          acc[categoryId].transactions.push(transaction)
          acc[categoryId].total += transaction.amount
          acc[categoryId].count += 1
          return acc
        },
        {} as Record<
          string,
          {
            category: { id: string; name: string; type: string; budgetId: string }
            transactions: typeof transactions
            total: number
            count: number
          }
        >,
      )

      return Object.values(grouped)
    }),

  /**
   * Create a new transaction
   */
  create: protectedProcedure
    .input(
      z.object({
        budgetId: z.string(),
        userId: z.string(),
        accountId: z.string(),
        categoryId: z.string(),
        name: z.string().min(1, 'Name is required'),
        amount: z.number().positive('Amount must be positive'),
        date: z.date(),
        notes: z.string().optional(),
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

      // Verify account belongs to budget
      const account = await ctx.prisma.account.findFirst({
        where: {
          id: input.accountId,
          budgetId: input.budgetId,
        },
      })

      if (!account) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Account not found or does not belong to this budget',
        })
      }

      // Verify category belongs to budget
      const category = await ctx.prisma.category.findFirst({
        where: {
          id: input.categoryId,
          budgetId: input.budgetId,
        },
      })

      if (!category) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Category not found or does not belong to this budget',
        })
      }

      return ctx.prisma.transaction.create({
        data: {
          name: input.name,
          amount: input.amount,
          date: input.date,
          notes: input.notes,
          budgetId: input.budgetId,
          accountId: input.accountId,
          categoryId: input.categoryId,
        },
        include: {
          category: true,
          account: true,
        },
      })
    }),

  /**
   * Update a transaction
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        userId: z.string(),
        accountId: z.string().optional(),
        categoryId: z.string().optional(),
        name: z.string().min(1, 'Name is required').optional(),
        amount: z.number().positive('Amount must be positive').optional(),
        date: z.date().optional(),
        notes: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership through budget
      const transaction = await ctx.prisma.transaction.findFirst({
        where: {
          id: input.id,
          budget: {
            userId: input.userId,
          },
        },
        include: {
          budget: true,
        },
      })

      if (!transaction) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Transaction not found',
        })
      }

      // If updating account or category, verify they belong to the same budget
      if (input.accountId) {
        const account = await ctx.prisma.account.findFirst({
          where: {
            id: input.accountId,
            budgetId: transaction.budgetId,
          },
        })

        if (!account) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Account does not belong to this budget',
          })
        }
      }

      if (input.categoryId) {
        const category = await ctx.prisma.category.findFirst({
          where: {
            id: input.categoryId,
            budgetId: transaction.budgetId,
          },
        })

        if (!category) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Category does not belong to this budget',
          })
        }
      }

      return ctx.prisma.transaction.update({
        where: { id: input.id },
        data: {
          name: input.name,
          amount: input.amount,
          date: input.date,
          notes: input.notes,
          accountId: input.accountId,
          categoryId: input.categoryId,
        },
        include: {
          category: true,
          account: true,
        },
      })
    }),

  /**
   * Delete a transaction
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
      const transaction = await ctx.prisma.transaction.findFirst({
        where: {
          id: input.id,
          budget: {
            userId: input.userId,
          },
        },
      })

      if (!transaction) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Transaction not found',
        })
      }

      await ctx.prisma.transaction.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),

  /**
   * Clone a transaction (useful for recurring transactions)
   */
  clone: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        userId: z.string(),
        date: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get the original transaction
      const original = await ctx.prisma.transaction.findFirst({
        where: {
          id: input.id,
          budget: {
            userId: input.userId,
          },
        },
      })

      if (!original) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Transaction not found',
        })
      }

      // Create a clone with a new date (default to today)
      return ctx.prisma.transaction.create({
        data: {
          name: original.name,
          amount: original.amount,
          date: input.date || new Date(),
          notes: original.notes,
          budgetId: original.budgetId,
          accountId: original.accountId,
          categoryId: original.categoryId,
        },
        include: {
          category: true,
          account: true,
        },
      })
    }),
} satisfies TRPCRouterRecord
