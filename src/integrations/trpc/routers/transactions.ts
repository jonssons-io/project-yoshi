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
        userId: z.string(), // For access verification
        accountId: z.string().optional(),
        categoryId: z.string().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        type: z.enum(['INCOME', 'EXPENSE']).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify budget exists and user has access to its household
      const budget = await ctx.prisma.budget.findUnique({
        where: { id: input.budgetId },
      })

      if (!budget) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Budget not found',
        })
      }

      // Verify user has access to this household
      const householdUser = await ctx.prisma.householdUser.findFirst({
        where: {
          householdId: budget.householdId,
          userId: input.userId,
        },
      })

      if (!householdUser) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this budget',
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
        billId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify budget exists and user has access to its household
      const budget = await ctx.prisma.budget.findUnique({
        where: { id: input.budgetId },
      })

      if (!budget) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Budget not found',
        })
      }

      // Verify user has access to this household
      const householdUser = await ctx.prisma.householdUser.findFirst({
        where: {
          householdId: budget.householdId,
          userId: input.userId,
        },
      })

      if (!householdUser) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this budget',
        })
      }

      // Verify account is linked to this budget
      const accountLink = await ctx.prisma.budgetAccount.findFirst({
        where: {
          budgetId: input.budgetId,
          accountId: input.accountId,
        },
      })

      if (!accountLink) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Account is not linked to this budget',
        })
      }

      // Verify category is linked to this budget
      const categoryLink = await ctx.prisma.budgetCategory.findFirst({
        where: {
          budgetId: input.budgetId,
          categoryId: input.categoryId,
        },
      })

      if (!categoryLink) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Category is not linked to this budget',
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
          billId: input.billId,
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
      // Get transaction with budget
      const transaction = await ctx.prisma.transaction.findUnique({
        where: { id: input.id },
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

      // Verify user has access to this household
      const householdUser = await ctx.prisma.householdUser.findFirst({
        where: {
          householdId: transaction.budget.householdId,
          userId: input.userId,
        },
      })

      if (!householdUser) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this transaction',
        })
      }

      // If updating account, verify it's linked to the budget
      if (input.accountId) {
        const accountLink = await ctx.prisma.budgetAccount.findFirst({
          where: {
            budgetId: transaction.budgetId,
            accountId: input.accountId,
          },
        })

        if (!accountLink) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Account is not linked to this budget',
          })
        }
      }

      // If updating category, verify it's linked to the budget
      if (input.categoryId) {
        const categoryLink = await ctx.prisma.budgetCategory.findFirst({
          where: {
            budgetId: transaction.budgetId,
            categoryId: input.categoryId,
          },
        })

        if (!categoryLink) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Category is not linked to this budget',
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
        userId: z.string(), // For access verification
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get transaction with budget
      const transaction = await ctx.prisma.transaction.findUnique({
        where: { id: input.id },
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

      // Verify user has access to this household
      const householdUser = await ctx.prisma.householdUser.findFirst({
        where: {
          householdId: transaction.budget.householdId,
          userId: input.userId,
        },
      })

      if (!householdUser) {
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
