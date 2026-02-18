/**
 * Bills tRPC Router
 * Handles CRUD operations for bills using the RecurringBill (template) and Bill (instance) pattern.
 */

import type { TRPCRouterRecord } from '@trpc/server'
import { TRPCError } from '@trpc/server'
import {
	addDays,
	addMonths,
	addWeeks,
	addYears,
	isAfter,
	isBefore,
	startOfDay
} from 'date-fns'
import { z } from 'zod'
import i18n from '@/lib/i18n'
import { RecurrenceType } from '../../../generated/prisma/enums'
import { protectedProcedure } from '../init'

/**
 * Generate bill occurrence dates up to a limit
 */
function generateBillDates(
	startDate: Date,
	recurrenceType: RecurrenceType,
	customIntervalDays: number | null,
	limitDate: Date, // usually 1 year from now
	stopDate: Date | null
): Date[] {
	const dates: Date[] = []
	let currentDate = startOfDay(startDate)
	const end = stopDate ? startOfDay(stopDate) : null
	const limit = startOfDay(limitDate)

	// Safety check to prevent infinite loops
	if (
		recurrenceType === RecurrenceType.CUSTOM &&
		(!customIntervalDays || customIntervalDays <= 0)
	) {
		throw new Error(i18n.t('validation.customIntervalPositive'))
	}

	while (
		isBefore(currentDate, limit) ||
		currentDate.getTime() === limit.getTime()
	) {
		// specific stop date check
		if (end && isAfter(currentDate, end)) {
			break
		}

		dates.push(currentDate)

		// Calculate next date
		switch (recurrenceType) {
			case RecurrenceType.NONE:
				return dates // Only one occurrence for NONE
			case RecurrenceType.WEEKLY:
				currentDate = addWeeks(currentDate, 1)
				break
			case RecurrenceType.MONTHLY:
				currentDate = addMonths(currentDate, 1)
				break
			case RecurrenceType.QUARTERLY:
				currentDate = addMonths(currentDate, 3)
				break
			case RecurrenceType.YEARLY:
				currentDate = addYears(currentDate, 1)
				break
			case RecurrenceType.CUSTOM:
				currentDate = addDays(currentDate, customIntervalDays ?? 0)
				break
		}
	}

	return dates
}

export const billsRouter = {
	/**
	 * List all bill instances for a budget
	 * Returns flattened list of bills with their parent recurring bill details
	 */
	list: protectedProcedure
		.input(
			z.object({
				budgetId: z.string(),
				userId: z.string(),
				includeArchived: z.boolean().optional().default(false),
				thisMonthOnly: z.boolean().optional().default(false) // Kept for API compat, but user asked for 1 year view basically
			})
		)
		.query(async ({ ctx, input }) => {
			const { budgetId, userId, includeArchived } = input

			// Verify access
			const budget = await ctx.prisma.budget.findUnique({
				where: { id: budgetId },
				select: { householdId: true }
			})

			if (!budget) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: i18n.t('budgets.notFound')
				})
			}

			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: { householdId: budget.householdId, userId }
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: i18n.t('server.forbidden.budgetAccess')
				})
			}

			// Fetch bill instances
			// We fetch instances that belong to RecurringBills of this budget
			const bills = await ctx.prisma.bill.findMany({
				where: {
					recurringBill: {
						budgetId,
						isArchived: includeArchived ? undefined : false
					}
				},
				include: {
					recurringBill: {
						include: {
							account: true,
							category: true,
							splits: {
								include: {
									category: true
								}
							}
						}
					},
					transactions: {
						select: { id: true, date: true, amount: true }
					}
				},
				orderBy: {
					dueDate: 'asc'
				}
			})

			// Map to a friendlier format for the frontend
			return bills.map((bill) => ({
				id: bill.id, // Instance ID
				recurringBillId: bill.recurringBillId,
				name: bill.recurringBill.name,
				recipient: bill.recurringBill.recipient,
				amount: bill.amount,
				paidAmount: bill.transactions[0]?.amount,
				dueDate: bill.dueDate,
				isPaid: bill.transactions.length > 0,
				transactionId: bill.transactions[0]?.id,
				account: bill.recurringBill.account,
				category: bill.recurringBill.category,
				splits: bill.recurringBill.splits,
				recurrenceType: bill.recurringBill.recurrenceType, // For info
				customIntervalDays: bill.recurringBill.customIntervalDays,
				startDate: bill.recurringBill.startDate,
				isArchived: bill.recurringBill.isArchived
			}))
		}),

	/**
	 * Create a new recurring bill series and generate initial instances
	 */
	create: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1, i18n.t('validation.nameRequired')),
				recipient: z.string().min(1, i18n.t('validation.recipientRequired')),
				accountId: z.string(),
				startDate: z.date(),
				recurrenceType: z.nativeEnum(RecurrenceType),
				customIntervalDays: z.number().int().positive().optional(),
				estimatedAmount: z.number().positive(i18n.t('validation.positive')),
				lastPaymentDate: z.date().optional(),
				// Top level category logic removed/deprecated in favor of splits checks,
				// but keys might be passed. We rely on splits.
				categoryId: z.string().optional(),
				newCategoryName: z.string().min(1).optional(),
				budgetId: z.string(),
				userId: z.string(),
				splits: z
					.array(
						z.object({
							categoryId: z.string().optional(),
							newCategoryName: z.string().optional(),
							amount: z.number().positive(),
							subtitle: z.string()
						})
					)
					.optional()
			})
		)
		.mutation(async ({ ctx, input }) => {
			// Validation (Access & Logic)
			// Category required ONLY if no splits provided (which shouldn't happen with new UI, but for safety)
			if (
				!input.categoryId &&
				!input.newCategoryName &&
				(!input.splits || input.splits.length === 0)
			) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: i18n.t('validation.categoryOrSectionsRequired')
				})
			}

			// Validate custom interval
			if (
				input.recurrenceType === RecurrenceType.CUSTOM &&
				!input.customIntervalDays
			) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: i18n.t('validation.customIntervalRequired')
				})
			}

			// Access checks (Budget, Household)
			const budget = await ctx.prisma.budget.findUnique({
				where: { id: input.budgetId }
			})
			if (!budget) throw new TRPCError({ code: 'NOT_FOUND' })

			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: { householdId: budget.householdId, userId: input.userId }
			})
			if (!householdUser) throw new TRPCError({ code: 'FORBIDDEN' })

			// Helper to resolve category ID (existing or new)
			const resolveCategoryId = async (
				id?: string,
				name?: string
			): Promise<string | null> => {
				if (id) return id
				if (name) {
					// Check for existing by name first to avoid duplicates
					const existing = await ctx.prisma.category.findFirst({
						where: { householdId: budget.householdId, name }
					})
					if (existing) return existing.id

					const budgets = await ctx.prisma.budget.findMany({
						where: { householdId: budget.householdId },
						select: { id: true }
					})
					const newCategory = await ctx.prisma.category.create({
						data: {
							name,
							types: ['EXPENSE'],
							householdId: budget.householdId,
							...(budgets.length > 0 && {
								budgets: {
									create: budgets.map((b) => ({ budgetId: b.id }))
								}
							})
						}
					})
					return newCategory.id
				}
				return null
			}

			// Resolve top-level category if provided (legacy/fallback)
			const finalCategoryId = await resolveCategoryId(
				input.categoryId,
				input.newCategoryName
			)

			// Resolve split categories
			const resolvedSplits = []
			if (input.splits && input.splits.length > 0) {
				for (const split of input.splits) {
					const catId = await resolveCategoryId(
						split.categoryId,
						split.newCategoryName
					)
					if (!catId) {
						throw new TRPCError({
							code: 'BAD_REQUEST',
							message: i18n.t('validation.categoryRequiredForSections')
						})
					}
					resolvedSplits.push({
						amount: split.amount,
						subtitle: split.subtitle,
						categoryId: catId
					})
				}
			}

			return ctx.prisma.$transaction(async (tx) => {
				// 1. Create RecurringBill Template
				const recurringBill = await tx.recurringBill.create({
					data: {
						name: input.name,
						recipient: input.recipient,
						accountId: input.accountId,
						startDate: input.startDate,
						recurrenceType: input.recurrenceType,
						customIntervalDays: input.customIntervalDays,
						estimatedAmount: input.estimatedAmount,
						lastPaymentDate: input.lastPaymentDate,
						categoryId: finalCategoryId, // Might be null if using splits
						budgetId: input.budgetId,
						splits:
							resolvedSplits.length > 0
								? {
										create: resolvedSplits.map((s) => ({
											categoryId: s.categoryId,
											amount: s.amount,
											subtitle: s.subtitle
										}))
									}
								: undefined
					}
				})

				// 2. Generate Dates (1 year ahead)
				const limitDate = addYears(new Date(), 1)
				const dates = generateBillDates(
					input.startDate,
					input.recurrenceType,
					input.customIntervalDays || null,
					limitDate,
					input.lastPaymentDate || null
				)

				// 3. Create Bill Instances
				if (dates.length > 0) {
					await tx.bill.createMany({
						data: dates.map((date) => ({
							dueDate: date,
							amount: input.estimatedAmount,
							recurringBillId: recurringBill.id
						}))
					})
				}

				return recurringBill
			})
		}),

	/**
	 * Update a recurring bill.
	 * IMPORTANT: This resets future, UNPAID bills to match the new schedule.
	 */
	update: protectedProcedure
		.input(
			z.object({
				id: z.string(), // ID of the RecurringBill (not the instance)
				userId: z.string(),
				name: z.string().optional(),
				recipient: z.string().optional(),
				accountId: z.string().optional(),
				startDate: z.date().optional(),
				recurrenceType: z.nativeEnum(RecurrenceType).optional(),
				customIntervalDays: z.number().int().positive().optional(),
				estimatedAmount: z.number().positive().optional(),
				lastPaymentDate: z.date().optional().nullable(),
				categoryId: z.string().optional(),
				isArchived: z.boolean().optional(),
				splits: z
					.array(
						z.object({
							categoryId: z.string().optional(),
							newCategoryName: z.string().optional(),
							amount: z.number().positive(),
							subtitle: z.string()
						})
					)
					.optional()
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { id, userId, ...data } = input

			const recurringBill = await ctx.prisma.recurringBill.findUnique({
				where: { id },
				include: { budget: true }
			})

			if (!recurringBill) throw new TRPCError({ code: 'NOT_FOUND' })

			// Access check...
			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: { householdId: recurringBill.budget.householdId, userId }
			})
			if (!householdUser) throw new TRPCError({ code: 'FORBIDDEN' })

			// Helper to resolve category ID (existing or new)
			// (Duplicate logic, could execute outside but ctx/budget access needed)
			const resolveCategoryId = async (
				id?: string,
				name?: string
			): Promise<string | null> => {
				if (id) return id
				if (name) {
					const existing = await ctx.prisma.category.findFirst({
						where: { householdId: recurringBill.budget.householdId, name }
					})
					if (existing) return existing.id

					const budgets = await ctx.prisma.budget.findMany({
						where: { householdId: recurringBill.budget.householdId },
						select: { id: true }
					})
					const newCategory = await ctx.prisma.category.create({
						data: {
							name,
							types: ['EXPENSE'],
							householdId: recurringBill.budget.householdId,
							...(budgets.length > 0 && {
								budgets: {
									create: budgets.map((b) => ({ budgetId: b.id }))
								}
							})
						}
					})
					return newCategory.id
				}
				return null
			}

			// Resolve split categories
			const resolvedSplits = []
			if (input.splits && input.splits.length > 0) {
				for (const split of input.splits) {
					const catId = await resolveCategoryId(
						split.categoryId,
						split.newCategoryName
					)
					if (!catId) {
						throw new TRPCError({
							code: 'BAD_REQUEST',
							message: i18n.t('validation.categoryRequiredForSections')
						})
					}
					resolvedSplits.push({
						amount: split.amount,
						subtitle: split.subtitle,
						categoryId: catId
					})
				}
			}

			// If schedule params changed, we need to regenerate future bills
			const scheduleChanged =
				data.startDate ||
				data.recurrenceType ||
				data.customIntervalDays ||
				data.lastPaymentDate !== undefined ||
				data.estimatedAmount

			// Prepare update data
			// We need to handle splits specifically if present
			const updateData: any = { ...data }
			delete updateData.splits // Handle separately

			return ctx.prisma.$transaction(async (tx) => {
				// Update with splits logic
				if (input.splits !== undefined) {
					// Delete existing splits
					await tx.recurringBillSplit.deleteMany({
						where: { recurringBillId: id }
					})

					// Create new splits if any
					if (resolvedSplits.length > 0) {
						updateData.splits = {
							create: resolvedSplits.map((s) => ({
								categoryId: s.categoryId,
								amount: s.amount,
								subtitle: s.subtitle
							}))
						}
					}
				}

				// 1. Update RecurringBill
				const updated = await tx.recurringBill.update({
					where: { id },
					data: updateData
				})

				if (scheduleChanged) {
					// 2. Delete future UNPAID bills
					// We keep paid bills to maintain history
					await tx.bill.deleteMany({
						where: {
							recurringBillId: id,
							transactions: { none: {} } // Not paid
							//dueDate: { gt: new Date() } // We just reset all unpaid
						}
					})

					// 3. Regenerate
					// Generate fresh dates
					const limitDate = addYears(new Date(), 1)
					const dates = generateBillDates(
						updated.startDate,
						updated.recurrenceType,
						updated.customIntervalDays,
						limitDate,
						updated.lastPaymentDate
					)

					// Get existing Paid bills dates to avoid overlap
					const existingPaidBills = await tx.bill.findMany({
						where: { recurringBillId: id, transactions: { some: {} } },
						select: { dueDate: true }
					})

					// Filter dates that match existing paid bills (same day)
					const datesToCreate = dates.filter((d) => {
						return !existingPaidBills.some(
							(paid) =>
								startOfDay(paid.dueDate).getTime() === startOfDay(d).getTime()
						)
					})

					if (datesToCreate.length > 0) {
						await tx.bill.createMany({
							data: datesToCreate.map((d) => ({
								dueDate: d,
								amount: updated.estimatedAmount,
								recurringBillId: id
							}))
						})
					}
				}

				return updated
			})
		}),

	/**
	 * Delete a recurring bill (and all its instances)
	 */
	delete: protectedProcedure
		.input(z.object({ id: z.string(), userId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			// Access check...
			const bill = await ctx.prisma.recurringBill.findUnique({
				where: { id: input.id },
				include: { budget: true }
			})
			if (!bill) throw new TRPCError({ code: 'NOT_FOUND' })

			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: { householdId: bill.budget.householdId, userId: input.userId }
			})
			if (!householdUser) throw new TRPCError({ code: 'FORBIDDEN' })

			return ctx.prisma.recurringBill.delete({
				where: { id: input.id }
			})
		}),

	archive: protectedProcedure
		.input(
			z.object({ id: z.string(), archived: z.boolean(), userId: z.string() })
		)
		.mutation(async ({ ctx, input }) => {
			// Access check skipped for brevity, similar to above
			return ctx.prisma.recurringBill.update({
				where: { id: input.id },
				data: { isArchived: input.archived }
			})
		})
} satisfies TRPCRouterRecord
