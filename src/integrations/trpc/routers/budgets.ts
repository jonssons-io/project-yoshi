import { z } from 'zod'
import { protectedProcedure } from '../init'
import { TRPCError } from '@trpc/server'

import type { TRPCRouterRecord } from '@trpc/server'

/**
 * Budget router for managing budgets
 * All operations are scoped to authenticated user
 */
export const budgetsRouter = {
  /**
   * List all budgets for the authenticated user
   */
  list: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.budget.findMany({
        where: {
          userId: input.userId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          _count: {
            select: {
              categories: true,
              accounts: true,
              transactions: true,
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
        userId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const budget = await ctx.prisma.budget.findFirst({
        where: {
          id: input.id,
          userId: input.userId,
        },
        include: {
          categories: true,
          accounts: true,
          _count: {
            select: {
              transactions: true,
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

      return budget
    }),

  /**
   * Create a new budget
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Name is required'),
        startDate: z.date(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.budget.create({
        data: {
          name: input.name,
          startDate: input.startDate,
          userId: input.userId,
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
        userId: z.string(),
        name: z.string().min(1, 'Name is required').optional(),
        startDate: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const budget = await ctx.prisma.budget.findFirst({
        where: {
          id: input.id,
          userId: input.userId,
        },
      })

      if (!budget) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Budget not found',
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
   * Delete a budget (will cascade to categories, accounts, transactions)
   */
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const budget = await ctx.prisma.budget.findFirst({
        where: {
          id: input.id,
          userId: input.userId,
        },
      })

      if (!budget) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Budget not found',
        })
      }

      await ctx.prisma.budget.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),
} satisfies TRPCRouterRecord
