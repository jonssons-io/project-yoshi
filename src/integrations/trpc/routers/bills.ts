/**
 * Bills tRPC Router
 * Handles CRUD operations for bills and occurrence calculations
 */

import type { TRPCRouterRecord } from '@trpc/server'
import { TRPCError } from '@trpc/server'
import {
	addDays,
	addMonths,
	addWeeks,
	addYears,
	isWithinInterval,
	startOfDay
} from 'date-fns'
import { z } from 'zod'
import { RecurrenceType } from '../../../generated/prisma/enums'
import { protectedProcedure } from '../init'

/**
 * Calculate the next occurrence date for a bill based on its recurrence
 */
function calculateNextOccurrence(
	startDate: Date,
	recurrenceType: RecurrenceType,
	customIntervalDays: number | null,
	lastPaymentDate: Date | null,
	afterDate: Date = new Date()
): Date | null {
	// If there's a last payment date and we've passed it, return null
	if (lastPaymentDate && afterDate >= startOfDay(lastPaymentDate)) {
		return null
	}

	const start = startOfDay(startDate)
	let nextDate = start

	// If start date hasn't occurred yet, return it
	if (nextDate > afterDate) {
		return nextDate
	}

	// Calculate next occurrence based on recurrence type
	switch (recurrenceType) {
		case RecurrenceType.NONE:
			// One-time bill - return start date if it hasn't passed, otherwise null
			return nextDate > afterDate ? nextDate : null

		case RecurrenceType.WEEKLY:
			while (nextDate <= afterDate) {
				nextDate = addWeeks(nextDate, 1)
			}
			break

		case RecurrenceType.MONTHLY:
			while (nextDate <= afterDate) {
				nextDate = addMonths(nextDate, 1)
			}
			break

		case RecurrenceType.QUARTERLY:
			while (nextDate <= afterDate) {
				nextDate = addMonths(nextDate, 3)
			}
			break

		case RecurrenceType.YEARLY:
			while (nextDate <= afterDate) {
				nextDate = addYears(nextDate, 1)
			}
			break

		case RecurrenceType.CUSTOM:
			if (!customIntervalDays || customIntervalDays <= 0) {
				throw new Error('Custom interval days must be positive')
			}
			while (nextDate <= afterDate) {
				nextDate = addDays(nextDate, customIntervalDays)
			}
			break
	}

	// Check if next occurrence is after last payment date
	if (lastPaymentDate && nextDate > startOfDay(lastPaymentDate)) {
		return null
	}

	return nextDate
}

/**
 * Check if a bill has a scheduled transaction for its next occurrence
 */
async function checkScheduledTransaction(
	prisma: any,
	billId: string,
	nextOccurrence: Date
): Promise<boolean> {
	if (!nextOccurrence) return false

	const windowStart = addDays(nextOccurrence, -7)
	const windowEnd = addDays(nextOccurrence, 7)

	const scheduledTransaction = await prisma.transaction.findFirst({
		where: {
			billId,
			date: {
				gte: windowStart,
				lte: windowEnd
			}
		}
	})

	return !!scheduledTransaction
}

export const billsRouter = {
	/**
	 * List all bills for a budget
	 */
	list: protectedProcedure
		.input(
			z.object({
				budgetId: z.string(),
				userId: z.string(), // For access verification
				includeArchived: z.boolean().optional().default(false),
				thisMonthOnly: z.boolean().optional().default(false)
			})
		)
		.query(async ({ ctx, input }) => {
			const { budgetId, userId, includeArchived, thisMonthOnly } = input

			// Verify budget exists and user has access to its household
			const budget = await ctx.prisma.budget.findUnique({
				where: { id: budgetId }
			})

			if (!budget) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Budget not found'
				})
			}

			// Verify user has access to this household
			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: budget.householdId,
					userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'You do not have access to this budget'
				})
			}

			const bills = await ctx.prisma.bill.findMany({
				where: {
					budgetId,
					isArchived: includeArchived ? undefined : false
				},
				include: {
					account: true,
					category: true
				},
				orderBy: {
					startDate: 'asc'
				}
			})

			// Calculate next occurrence and check for scheduled transactions
			const billsWithStatus = await Promise.all(
				bills.map(async (bill) => {
					const nextOccurrence = calculateNextOccurrence(
						bill.startDate,
						bill.recurrenceType,
						bill.customIntervalDays,
						bill.lastPaymentDate
					)

					const hasScheduledTransaction = nextOccurrence
						? await checkScheduledTransaction(
								ctx.prisma,
								bill.id,
								nextOccurrence
							)
						: false

					return {
						...bill,
						nextOccurrence,
						hasScheduledTransaction
					}
				})
			)

			// Filter by this month if requested
			if (thisMonthOnly && !includeArchived) {
				const now = new Date()
				const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
				const monthEnd = new Date(
					now.getFullYear(),
					now.getMonth() + 1,
					0,
					23,
					59,
					59
				)

				return billsWithStatus.filter((bill) => {
					if (!bill.nextOccurrence) return false
					return isWithinInterval(bill.nextOccurrence, {
						start: monthStart,
						end: monthEnd
					})
				})
			}

			return billsWithStatus
		}),

	/**
	 * Get a single bill by ID
	 */
	getById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const bill = await ctx.prisma.bill.findUnique({
				where: { id: input.id },
				include: {
					account: true,
					category: true,
					budget: true
				}
			})

			if (!bill) {
				throw new Error('Bill not found')
			}

			const nextOccurrence = calculateNextOccurrence(
				bill.startDate,
				bill.recurrenceType,
				bill.customIntervalDays,
				bill.lastPaymentDate
			)

			const hasScheduledTransaction = nextOccurrence
				? await checkScheduledTransaction(ctx.prisma, bill.id, nextOccurrence)
				: false

			return {
				...bill,
				nextOccurrence,
				hasScheduledTransaction
			}
		}),

	/**
	 * Create a new bill
	 * Supports inline category creation when newCategory is provided instead of categoryId
	 */
	create: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1, 'Name is required'),
				recipient: z.string().min(1, 'Recipient is required'),
				accountId: z.string(),
				startDate: z.date(),
				recurrenceType: z.nativeEnum(RecurrenceType),
				customIntervalDays: z.number().int().positive().optional(),
				estimatedAmount: z.number().positive('Amount must be positive'),
				lastPaymentDate: z.date().optional(),
				// Either provide an existing category ID
				categoryId: z.string().optional(),
				// Or provide a name to create a new EXPENSE category
				newCategoryName: z.string().min(1).optional(),
				budgetId: z.string(),
				userId: z.string() // For access verification
			})
		)
		.mutation(async ({ ctx, input }) => {
			// Validate that either categoryId or newCategoryName is provided
			if (!input.categoryId && !input.newCategoryName) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'Either categoryId or newCategoryName must be provided'
				})
			}

			// Validate custom interval days for CUSTOM recurrence
			if (
				input.recurrenceType === RecurrenceType.CUSTOM &&
				!input.customIntervalDays
			) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'Custom interval days required for custom recurrence'
				})
			}

			// Verify budget exists and user has access to its household
			const budget = await ctx.prisma.budget.findUnique({
				where: { id: input.budgetId }
			})

			if (!budget) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Budget not found'
				})
			}

			// Verify user has access to this household
			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: budget.householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'You do not have access to this budget'
				})
			}

			// Verify account is linked to this budget
			const accountLink = await ctx.prisma.budgetAccount.findFirst({
				where: {
					budgetId: input.budgetId,
					accountId: input.accountId
				}
			})

			if (!accountLink) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'Account is not linked to this budget'
				})
			}

			// Determine the category ID to use
			let finalCategoryId: string

			if (input.newCategoryName) {
				// Create new EXPENSE category (bills are always expenses) and link to all budgets
				const budgets = await ctx.prisma.budget.findMany({
					where: { householdId: budget.householdId },
					select: { id: true }
				})

				const newCategory = await ctx.prisma.category.create({
					data: {
						name: input.newCategoryName,
						types: ['EXPENSE'], // Bills are always expenses
						householdId: budget.householdId,
						...(budgets.length > 0 && {
							budgets: {
								create: budgets.map((b) => ({
									budgetId: b.id
								}))
							}
						})
					}
				})
				finalCategoryId = newCategory.id
			} else if (input.categoryId) {
				// Verify category is linked to this budget
				const categoryLink = await ctx.prisma.budgetCategory.findFirst({
					where: {
						budgetId: input.budgetId,
						categoryId: input.categoryId
					}
				})

				if (!categoryLink) {
					// Check if category exists in household
					const category = await ctx.prisma.category.findUnique({
						where: { id: input.categoryId }
					})

					if (!category || category.householdId !== budget.householdId) {
						throw new TRPCError({
							code: 'BAD_REQUEST',
							message: 'Category not found or invalid'
						})
					}

					// Link it
					await ctx.prisma.budgetCategory.create({
						data: {
							budgetId: input.budgetId,
							categoryId: input.categoryId
						}
					})
				}
				finalCategoryId = input.categoryId
			} else {
				// This should never happen due to earlier validation
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'Either categoryId or newCategoryName must be provided'
				})
			}

			return ctx.prisma.bill.create({
				data: {
					name: input.name,
					recipient: input.recipient,
					accountId: input.accountId,
					startDate: input.startDate,
					recurrenceType: input.recurrenceType,
					customIntervalDays: input.customIntervalDays,
					estimatedAmount: input.estimatedAmount,
					lastPaymentDate: input.lastPaymentDate,
					categoryId: finalCategoryId,
					budgetId: input.budgetId
				}
			})
		}),

	/**
	 * Update an existing bill
	 */
	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				userId: z.string(), // For access verification
				name: z.string().min(1, 'Name is required').optional(),
				recipient: z.string().min(1, 'Recipient is required').optional(),
				accountId: z.string().optional(),
				startDate: z.date().optional(),
				recurrenceType: z.nativeEnum(RecurrenceType).optional(),
				customIntervalDays: z.number().int().positive().optional(),
				estimatedAmount: z
					.number()
					.positive('Amount must be positive')
					.optional(),
				lastPaymentDate: z.date().optional().nullable(),
				categoryId: z.string().optional(),
				isArchived: z.boolean().optional()
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { id, userId, ...updateData } = input

			// Get bill with budget
			const bill = await ctx.prisma.bill.findUnique({
				where: { id },
				include: {
					budget: true
				}
			})

			if (!bill) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Bill not found'
				})
			}

			// Verify user has access to this household
			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: bill.budget.householdId,
					userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'You do not have access to this bill'
				})
			}

			// If updating account, verify it's linked to the budget
			if (updateData.accountId) {
				const accountLink = await ctx.prisma.budgetAccount.findFirst({
					where: {
						budgetId: bill.budgetId,
						accountId: updateData.accountId
					}
				})

				if (!accountLink) {
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'Account is not linked to this budget'
					})
				}
			}

			// If updating category, verify it's linked to the budget
			if (updateData.categoryId) {
				const categoryLink = await ctx.prisma.budgetCategory.findFirst({
					where: {
						budgetId: bill.budgetId,
						categoryId: updateData.categoryId
					}
				})

				if (!categoryLink) {
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'Category is not linked to this budget'
					})
				}
			}

			return ctx.prisma.bill.update({
				where: { id },
				data: updateData
			})
		}),

	/**
	 * Delete a bill
	 */
	delete: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				userId: z.string() // For access verification
			})
		)
		.mutation(async ({ ctx, input }) => {
			// Get bill with budget
			const bill = await ctx.prisma.bill.findUnique({
				where: { id: input.id },
				include: {
					budget: true
				}
			})

			if (!bill) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Bill not found'
				})
			}

			// Verify user has access to this household
			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: bill.budget.householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'You do not have access to this bill'
				})
			}

			return ctx.prisma.bill.delete({
				where: { id: input.id }
			})
		}),

	/**
	 * Archive a bill
	 */
	archive: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				archived: z.boolean(),
				userId: z.string() // For access verification
			})
		)
		.mutation(async ({ ctx, input }) => {
			// Get bill with budget
			const bill = await ctx.prisma.bill.findUnique({
				where: { id: input.id },
				include: {
					budget: true
				}
			})

			if (!bill) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Bill not found'
				})
			}

			// Verify user has access to this household
			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: bill.budget.householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'You do not have access to this bill'
				})
			}

			return ctx.prisma.bill.update({
				where: { id: input.id },
				data: { isArchived: input.archived }
			})
		})
} satisfies TRPCRouterRecord
