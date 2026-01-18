import { z } from 'zod'
import { protectedProcedure } from '../init'
import { TRPCError } from '@trpc/server'

import type { TRPCRouterRecord } from '@trpc/server'

/**
 * Budget router for managing budgets
 * All operations are scoped to household
 */
export const budgetsRouter = {
  /**
   * List all budgets for a household
   */
  list: protectedProcedure
    .input(
      z.object({
        householdId: z.string(),
        userId: z.string(), // For access verification
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify user has access to this household
      const householdUser = await ctx.prisma.householdUser.findFirst({
        where: {
          householdId: input.householdId,
          userId: input.userId,
        },
      })

      if (!householdUser) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this household',
        })
      }

      return ctx.prisma.budget.findMany({
        where: {
          householdId: input.householdId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          _count: {
            select: {
              transactions: true,
              bills: true,
              categories: true,
              accounts: true,
            },
          },
        },
      })
    }),

  /**
   * Get a specific budget by ID
   */
  getById: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        userId: z.string(), // For access verification
      }),
    )
    .query(async ({ ctx, input }) => {
      const budget = await ctx.prisma.budget.findFirst({
        where: {
          id: input.id,
        },
        include: {
          household: true,
          categories: {
            include: {
              category: true,
            },
          },
          accounts: {
            include: {
              account: true,
            },
          },
          _count: {
            select: {
              transactions: true,
              bills: true,
            },
          },
        },
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

      return budget
    }),

  /**
   * Create a new budget
   * By default, links all household categories and accounts (opt-out model)
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Name is required'),
        startDate: z.date(),
        householdId: z.string(),
        userId: z.string(), // For access verification
        categoryIds: z.array(z.string()).optional(), // If provided, only link these categories
        accountIds: z.array(z.string()).optional(), // If provided, only link these accounts
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user has access to this household
      const householdUser = await ctx.prisma.householdUser.findFirst({
        where: {
          householdId: input.householdId,
          userId: input.userId,
        },
      })

      if (!householdUser) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this household',
        })
      }

      // If categoryIds/accountIds not provided, get all from household
      const categoryIds = input.categoryIds ?? (
        await ctx.prisma.category.findMany({
          where: { householdId: input.householdId },
          select: { id: true },
        })
      ).map((c) => c.id)

      const accountIds = input.accountIds ?? (
        await ctx.prisma.account.findMany({
          where: { householdId: input.householdId },
          select: { id: true },
        })
      ).map((a) => a.id)

      return ctx.prisma.budget.create({
        data: {
          name: input.name,
          startDate: input.startDate,
          householdId: input.householdId,
          categories: {
            create: categoryIds.map((categoryId) => ({ categoryId })),
          },
          accounts: {
            create: accountIds.map((accountId) => ({ accountId })),
          },
        },
        include: {
          categories: {
            include: {
              category: true,
            },
          },
          accounts: {
            include: {
              account: true,
            },
          },
        },
      })
    }),

  /**
   * Update a budget
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        userId: z.string(), // For access verification
        name: z.string().min(1, 'Name is required').optional(),
        startDate: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const budget = await ctx.prisma.budget.findUnique({
        where: { id: input.id },
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

      return ctx.prisma.budget.update({
        where: { id: input.id },
        data: {
          name: input.name,
          startDate: input.startDate,
        },
      })
    }),

  /**
   * Delete a budget (will cascade to transactions and bills)
   */
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        userId: z.string(), // For access verification
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const budget = await ctx.prisma.budget.findUnique({
        where: { id: input.id },
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

      await ctx.prisma.budget.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),

  /**
   * Link a category to a budget
   */
  linkCategory: protectedProcedure
    .input(
      z.object({
        budgetId: z.string(),
        categoryId: z.string(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const budget = await ctx.prisma.budget.findUnique({
        where: { id: input.budgetId },
      })

      if (!budget) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Budget not found',
        })
      }

      // Verify user has access
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

      // Verify category belongs to same household
      const category = await ctx.prisma.category.findUnique({
        where: { id: input.categoryId },
      })

      if (!category || category.householdId !== budget.householdId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Category not found or does not belong to this household',
        })
      }

      return ctx.prisma.budgetCategory.create({
        data: {
          budgetId: input.budgetId,
          categoryId: input.categoryId,
        },
      })
    }),

  /**
   * Unlink a category from a budget
   */
  unlinkCategory: protectedProcedure
    .input(
      z.object({
        budgetId: z.string(),
        categoryId: z.string(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const budget = await ctx.prisma.budget.findUnique({
        where: { id: input.budgetId },
      })

      if (!budget) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Budget not found',
        })
      }

      // Verify user has access
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

      const link = await ctx.prisma.budgetCategory.findFirst({
        where: {
          budgetId: input.budgetId,
          categoryId: input.categoryId,
        },
      })

      if (!link) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Category is not linked to this budget',
        })
      }

      return ctx.prisma.budgetCategory.delete({
        where: { id: link.id },
      })
    }),

  /**
   * Link an account to a budget
   */
  linkAccount: protectedProcedure
    .input(
      z.object({
        budgetId: z.string(),
        accountId: z.string(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const budget = await ctx.prisma.budget.findUnique({
        where: { id: input.budgetId },
      })

      if (!budget) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Budget not found',
        })
      }

      // Verify user has access
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

      // Verify account belongs to same household
      const account = await ctx.prisma.account.findUnique({
        where: { id: input.accountId },
      })

      if (!account || account.householdId !== budget.householdId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Account not found or does not belong to this household',
        })
      }

      return ctx.prisma.budgetAccount.create({
        data: {
          budgetId: input.budgetId,
          accountId: input.accountId,
        },
      })
    }),

  /**
   * Unlink an account from a budget
   */
  unlinkAccount: protectedProcedure
    .input(
      z.object({
        budgetId: z.string(),
        accountId: z.string(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const budget = await ctx.prisma.budget.findUnique({
        where: { id: input.budgetId },
      })

      if (!budget) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Budget not found',
        })
      }

      // Verify user has access
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

      const link = await ctx.prisma.budgetAccount.findFirst({
        where: {
          budgetId: input.budgetId,
          accountId: input.accountId,
        },
      })

      if (!link) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Account is not linked to this budget',
        })
      }

      return ctx.prisma.budgetAccount.delete({
        where: { id: link.id },
      })
    }),
} satisfies TRPCRouterRecord
