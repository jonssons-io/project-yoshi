import { z } from 'zod'
import { protectedProcedure } from '../init'
import { TRPCError } from '@trpc/server'

import type { TRPCRouterRecord } from '@trpc/server'

/**
 * Category router for managing income/expense categories
 */
export const categoriesRouter = {
  /**
   * List all categories for a budget
   */
  list: protectedProcedure
    .input(
      z.object({
        budgetId: z.string(),
        userId: z.string(),
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

      return ctx.prisma.category.findMany({
        where: {
          budgetId: input.budgetId,
          ...(input.type && { type: input.type }),
        },
        orderBy: {
          name: 'asc',
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
   * Get a specific category by ID
   */
  getById: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        userId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const category = await ctx.prisma.category.findFirst({
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

      if (!category) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Category not found',
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
        budgetId: z.string(),
        userId: z.string(),
        name: z.string().min(1, 'Name is required'),
        type: z.enum(['INCOME', 'EXPENSE']),
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

      return ctx.prisma.category.create({
        data: {
          name: input.name,
          type: input.type,
          budgetId: input.budgetId,
        },
      })
    }),

  /**
   * Update a category
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        userId: z.string(),
        name: z.string().min(1, 'Name is required').optional(),
        type: z.enum(['INCOME', 'EXPENSE']).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership through budget
      const category = await ctx.prisma.category.findFirst({
        where: {
          id: input.id,
          budget: {
            userId: input.userId,
          },
        },
      })

      if (!category) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Category not found',
        })
      }

      return ctx.prisma.category.update({
        where: { id: input.id },
        data: {
          name: input.name,
          type: input.type,
        },
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
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership through budget
      const category = await ctx.prisma.category.findFirst({
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

      if (!category) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Category not found',
        })
      }

      if (category._count.transactions > 0) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `Cannot delete category with ${category._count.transactions} transactions. Please reassign or delete transactions first.`,
        })
      }

      await ctx.prisma.category.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),
} satisfies TRPCRouterRecord
