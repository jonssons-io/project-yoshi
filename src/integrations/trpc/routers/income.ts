/**
 * Income tRPC Router
 * Handles managed recurring income
 */

import type { TRPCRouterRecord } from '@trpc/server'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { RecurrenceType } from '../../../generated/prisma/enums'
import { protectedProcedure } from '../init'

export const incomeRouter = {
	list: protectedProcedure
		.input(
			z.object({
				householdId: z.string(),
				userId: z.string(),
				includeArchived: z.boolean().default(false)
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
					message: 'You do not have access to this household'
				})
			}

			return ctx.prisma.income.findMany({
				where: {
					householdId: input.householdId,
					...(input.includeArchived ? {} : { isArchived: false })
				},
				orderBy: {
					expectedDate: 'asc'
				},
				include: {
					category: true,
					account: true
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
			const income = await ctx.prisma.income.findUnique({
				where: { id: input.id },
				include: {
					category: true,
					account: true,
					household: true
				}
			})

			if (!income) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Income not found'
				})
			}

			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: income.householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'You do not have access to this income'
				})
			}

			return income
		}),

	create: protectedProcedure
		.input(
			z.object({
				householdId: z.string(),
				userId: z.string(),
				name: z.string().min(1, 'Name is required'),
				source: z.string().min(1, 'Source is required'),
				amount: z.number().positive('Amount must be positive'),
				expectedDate: z.date(),
				accountId: z.string(),
				categoryId: z.string().optional(),
				recurrenceType: z.nativeEnum(RecurrenceType),
				customIntervalDays: z.number().optional().nullable(),
				endDate: z.date().optional().nullable(),
				newCategoryName: z.string().optional()
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
					message: 'You do not have access to this household'
				})
			}

			let finalCategoryId: string

			if (input.newCategoryName) {
				const newCategory = await ctx.prisma.category.create({
					data: {
						name: input.newCategoryName,
						types: ['INCOME'],
						householdId: input.householdId
					}
				})
				finalCategoryId = newCategory.id
			} else if (input.categoryId) {
				const category = await ctx.prisma.category.findUnique({
					where: { id: input.categoryId }
				})

				if (!category || category.householdId !== input.householdId) {
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'Category not found or invalid'
					})
				}
				finalCategoryId = input.categoryId
			} else {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'Category or new category name is required'
				})
			}

			const account = await ctx.prisma.account.findUnique({
				where: { id: input.accountId }
			})

			if (!account || account.householdId !== input.householdId) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'Account not found or invalid'
				})
			}

			return ctx.prisma.income.create({
				data: {
					name: input.name,
					source: input.source,
					estimatedAmount: input.amount,
					expectedDate: input.expectedDate,
					accountId: input.accountId,
					categoryId: finalCategoryId,
					householdId: input.householdId,
					recurrenceType: input.recurrenceType,
					customIntervalDays: input.customIntervalDays,
					endDate: input.endDate
				},
				include: {
					category: true,
					account: true
				}
			})
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				userId: z.string(),
				name: z.string().min(1).optional(),
				source: z.string().min(1).optional(),
				amount: z.number().positive().optional(),
				expectedDate: z.date().optional(),
				accountId: z.string().optional(),
				categoryId: z.string().optional(),
				recurrenceType: z.nativeEnum(RecurrenceType).optional(),
				customIntervalDays: z.number().optional().nullable(),
				endDate: z.date().optional().nullable()
			})
		)
		.mutation(async ({ ctx, input }) => {
			const income = await ctx.prisma.income.findUnique({
				where: { id: input.id },
				include: { household: true }
			})

			if (!income) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Income not found'
				})
			}

			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: income.householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'You do not have access to this income'
				})
			}

			if (input.categoryId) {
				const category = await ctx.prisma.category.findUnique({
					where: { id: input.categoryId }
				})
				if (!category || category.householdId !== income.householdId) {
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'Category not found or invalid'
					})
				}
			}

			if (input.accountId) {
				const account = await ctx.prisma.account.findUnique({
					where: { id: input.accountId }
				})
				if (!account || account.householdId !== income.householdId) {
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'Account not found or invalid'
					})
				}
			}

			return ctx.prisma.income.update({
				where: { id: input.id },
				data: {
					name: input.name,
					source: input.source,
					estimatedAmount: input.amount,
					expectedDate: input.expectedDate,
					accountId: input.accountId,
					categoryId: input.categoryId,
					recurrenceType: input.recurrenceType,
					customIntervalDays: input.customIntervalDays,
					endDate: input.endDate
				},
				include: {
					category: true,
					account: true
				}
			})
		}),

	delete: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				userId: z.string()
			})
		)
		.mutation(async ({ ctx, input }) => {
			const income = await ctx.prisma.income.findUnique({
				where: { id: input.id },
				include: { household: true }
			})

			if (!income) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Income not found'
				})
			}

			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: income.householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'You do not have access to this income'
				})
			}

			await ctx.prisma.income.delete({
				where: { id: input.id }
			})

			return { success: true }
		}),

	archive: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				userId: z.string(),
				isArchived: z.boolean()
			})
		)
		.mutation(async ({ ctx, input }) => {
			const income = await ctx.prisma.income.findUnique({
				where: { id: input.id },
				include: { household: true }
			})

			if (!income) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Income not found'
				})
			}

			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: income.householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'You do not have access to this income'
				})
			}

			return ctx.prisma.income.update({
				where: { id: input.id },
				data: { isArchived: input.isArchived }
			})
		})
} satisfies TRPCRouterRecord
