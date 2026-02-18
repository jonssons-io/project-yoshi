import type { TRPCRouterRecord } from '@trpc/server'
import { TRPCError } from '@trpc/server'
import { addDays, addMonths, addWeeks, addYears } from 'date-fns'
import { z } from 'zod'
import i18n from '@/lib/i18n'
import { RecurrenceType } from '../../../generated/prisma/enums'
import { protectedProcedure } from '../init'

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
				budgetId: z.string().optional(),
				householdId: z.string().optional(),
				userId: z.string(),
				accountId: z.string().optional(),
				categoryId: z.string().optional(),
				dateFrom: z.date().optional(),
				dateTo: z.date().optional(),
				type: z.enum(['INCOME', 'EXPENSE']).optional()
			})
		)
		.query(async ({ ctx, input }) => {
			if (!input.budgetId && !input.householdId) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: i18n.t('server.badRequest.missingBudgetOrHousehold')
				})
			}

			// Verify access
			let householdId = input.householdId
			if (input.budgetId) {
				const budget = await ctx.prisma.budget.findUnique({
					where: { id: input.budgetId }
				})
				if (!budget)
					throw new TRPCError({
						code: 'NOT_FOUND',
						message: i18n.t('budgets.notFound')
					})
				householdId = budget.householdId
			}

			if (!householdId)
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: i18n.t('server.badRequest.missingHouseholdId')
				})

			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: i18n.t('server.forbidden.householdAccess')
				})
			}

			const transactions = await ctx.prisma.transaction.findMany({
				where: {
					...(input.budgetId
						? { budgetId: input.budgetId }
						: { account: { householdId: householdId } }),
					...(input.accountId && { accountId: input.accountId }),
					...(input.categoryId && { categoryId: input.categoryId }),
					...(input.type && {
						category: {
							types: {
								has: input.type
							}
						}
					}),
					...(input.dateFrom || input.dateTo
						? {
								date: {
									...(input.dateFrom && { gte: input.dateFrom }),
									...(input.dateTo && { lte: input.dateTo })
								}
							}
						: {})
				},
				orderBy: {
					date: 'desc'
				},
				include: {
					category: true,
					account: true,
					recipient: true,
					bill: true,
					splits: {
						include: { category: true }
					}
				}
			})

			// Fetch transfers if categoryId is NOT set (transfers don't have categories)
			// biome-ignore lint/suspicious/noExplicitAny: complex union return type
			let transfers: any[] = []

			if (!input.categoryId) {
				transfers = await ctx.prisma.transfer.findMany({
					where: {
						budgetId: input.budgetId,
						// Account filter: either from or to must match
						...(input.accountId && {
							OR: [
								{ fromAccountId: input.accountId },
								{ toAccountId: input.accountId }
							]
						}),
						...(input.dateFrom || input.dateTo
							? {
									date: {
										...(input.dateFrom && { gte: input.dateFrom }),
										...(input.dateTo && { lte: input.dateTo })
									}
								}
							: {})
					},
					include: {
						fromAccount: true,
						toAccount: true
					}
				})
			}

			// Normalize and merge
			const mappedTransfers = transfers.flatMap((t) => {
				const parts = []

				// Outgoing (Expense-like)
				if (
					(!input.accountId || input.accountId === t.fromAccountId) &&
					(!input.type || input.type === 'EXPENSE')
				) {
					parts.push({
						id: `transfer-out-${t.id}`,
						originalId: t.id,
						name: `Transfer to ${t.toAccount.name}`,
						amount: t.amount,
						date: t.date,
						notes: t.notes,
						accountId: t.fromAccountId,
						account: t.fromAccount,
						categoryId: 'transfer-out',
						category: {
							id: 'transfer-out',
							name: 'Transfer Out',
							types: ['EXPENSE'],
							householdId: householdId,
							createdAt: t.createdAt
						},
						recipientId: null,
						recipient: null,
						budgetId: t.budgetId,
						billId: null,
						incomeId: null,
						createdAt: t.createdAt,
						isTransfer: true,
						fromAccountId: t.fromAccountId,
						toAccountId: t.toAccountId
					})
				}

				// Incoming (Income-like)
				if (
					(!input.accountId || input.accountId === t.toAccountId) &&
					(!input.type || input.type === 'INCOME')
				) {
					parts.push({
						id: `transfer-in-${t.id}`,
						originalId: t.id,
						name: `Transfer from ${t.fromAccount.name}`,
						amount: t.amount,
						date: t.date,
						notes: t.notes,
						accountId: t.toAccountId,
						account: t.toAccount,
						categoryId: 'transfer-in',
						category: {
							id: 'transfer-in',
							name: 'Transfer In',
							types: ['INCOME'],
							householdId: householdId,
							createdAt: t.createdAt
						},
						recipientId: null,
						recipient: null,
						budgetId: t.budgetId,
						billId: null,
						incomeId: null,
						createdAt: t.createdAt,
						isTransfer: true,
						fromAccountId: t.fromAccountId,
						toAccountId: t.toAccountId
					})
				}

				return parts
			})

			const allItems = [...transactions, ...mappedTransfers].sort(
				(a, b) => b.date.getTime() - a.date.getTime()
			)

			return allItems
		}),

	/**
	 * Get a specific transaction by ID
	 */
	getById: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				userId: z.string()
			})
		)
		.query(async ({ ctx, input }) => {
			const transaction = await ctx.prisma.transaction.findUnique({
				where: { id: input.id },
				include: {
					category: true,
					account: true,
					budget: true,
					recipient: true,
					bill: true,
					splits: {
						include: { category: true }
					}
				}
			})

			if (!transaction) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: i18n.t('transactions.notFound')
				})
			}

			// Verify user has access to this household
			const householdId =
				transaction.budget?.householdId ?? transaction.account.householdId

			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: i18n.t('transactions.notFound')
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
				type: z.enum(['INCOME', 'EXPENSE']).optional()
			})
		)
		.query(async ({ ctx, input }) => {
			// Verify budget exists and user has access
			const budget = await ctx.prisma.budget.findUnique({
				where: { id: input.budgetId }
			})

			if (!budget) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: i18n.t('budgets.notFound')
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
					message: i18n.t('server.forbidden.budgetAccess')
				})
			}

			const transactions = await ctx.prisma.transaction.findMany({
				where: {
					budgetId: input.budgetId,
					...(input.type && {
						category: {
							types: {
								has: input.type
							}
						}
					}),
					...(input.dateFrom || input.dateTo
						? {
								date: {
									...(input.dateFrom && { gte: input.dateFrom }),
									...(input.dateTo && { lte: input.dateTo })
								}
							}
						: {})
				},
				include: {
					category: true
				},
				orderBy: {
					date: 'desc'
				}
			})

			// Group by category
			const grouped = transactions.reduce(
				(acc, transaction) => {
					const categoryId = transaction.categoryId ?? 'uncategorized'
					if (!acc[categoryId]) {
						acc[categoryId] = {
							category: transaction.category ?? {
								id: 'uncategorized',
								name: i18n.t('common.uncategorized'),
								types: [],
								// biome-ignore lint/suspicious/noExplicitAny: Transaction type inference issue
								householdId: (transaction as any).account.householdId
							},
							transactions: [],
							total: 0,
							count: 0
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
						category: {
							id: string
							name: string
							types: string[]
							householdId: string
						}
						transactions: typeof transactions
						total: number
						count: number
					}
				>
			)

			return Object.values(grouped)
		}),

	/**
	 * Create a new transaction
	 * Supports inline category creation when newCategory is provided instead of categoryId
	 */
	create: protectedProcedure
		.input(
			z.object({
				budgetId: z.string().optional(),
				userId: z.string(),
				accountId: z.string(),
				// Either provide an existing category ID
				categoryId: z.string().optional(),
				// Or provide data to create a new category
				newCategory: z
					.object({
						name: z.string().min(1, i18n.t('validation.categoryNameRequired')),
						type: z.enum(['INCOME', 'EXPENSE'])
					})
					.optional(),
				name: z.string().min(1, i18n.t('validation.nameRequired')),
				amount: z.number().positive(i18n.t('validation.positive')),
				date: z.date(),
				notes: z.string().optional(),
				billId: z.string().optional(),
				// Recipient support (optional)
				recipientId: z.string().optional(),
				newRecipientName: z.string().min(1).optional(),
				incomeId: z.string().optional(),
				// Splits (Optional)
				splits: z
					.array(
						z.object({
							categoryId: z.string(),
							amount: z.number().positive(),
							subtitle: z.string()
						})
					)
					.optional()
			})
		)
		.mutation(async ({ ctx, input }) => {
			// Validate that either categoryId or newCategory OR splits is provided
			if (
				!input.categoryId &&
				!input.newCategory &&
				(!input.splits || input.splits.length === 0)
			) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: i18n.t('server.badRequest.missingCategoryInfo')
				})
			}

			let householdId: string
			let budget: { id: string; householdId: string } | null = null

			// Verify budget if provided
			if (input.budgetId) {
				budget = await ctx.prisma.budget.findUnique({
					where: { id: input.budgetId }
				})

				if (!budget) {
					throw new TRPCError({
						code: 'NOT_FOUND',
						message: i18n.t('budgets.notFound')
					})
				}
				householdId = budget.householdId
			} else {
				// If no budget, verify account to get household
				const account = await ctx.prisma.account.findUnique({
					where: { id: input.accountId }
				})
				if (!account) {
					throw new TRPCError({
						code: 'NOT_FOUND',
						message: i18n.t('accounts.notFound')
					})
				}
				householdId = account.householdId
			}

			// Verify user has access to this household
			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: i18n.t('server.forbidden.householdAccess')
				})
			}

			// Verify account is linked to this budget (if budget exists)
			if (budget) {
				const accountLink = await ctx.prisma.budgetAccount.findFirst({
					where: {
						budgetId: budget.id,
						accountId: input.accountId
					}
				})

				if (!accountLink) {
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: i18n.t('server.badRequest.accountNotLinked')
					})
				}
			} else {
				// Just verify account exists and matches household (already done above)
			}

			// Determine the category ID to use
			let finalCategoryId: string | null = null

			if (input.newCategory) {
				// Create new category
				// Link to ALL budgets in the household
				const budgets = await ctx.prisma.budget.findMany({
					where: { householdId: householdId },
					select: { id: true }
				})

				const newCategory = await ctx.prisma.category.create({
					data: {
						name: input.newCategory.name,
						types: [input.newCategory.type],
						householdId: householdId,
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
				finalCategoryId = input.categoryId
				// If budget provided, check linkage
				if (budget) {
					const categoryLink = await ctx.prisma.budgetCategory.findFirst({
						where: {
							budgetId: budget.id,
							categoryId: input.categoryId
						}
					})
					if (!categoryLink) {
						// Check if category exists in household
						const category = await ctx.prisma.category.findUnique({
							where: { id: input.categoryId }
						})

						if (!category || category.householdId !== householdId) {
							throw new TRPCError({
								code: 'BAD_REQUEST',
								message: i18n.t('categories.notFoundOrInvalid')
							})
						}

						// Link it
						await ctx.prisma.budgetCategory.create({
							data: {
								budgetId: budget.id,
								categoryId: input.categoryId
							}
						})
					}
				} else {
					// Check category household
					const category = await ctx.prisma.category.findUnique({
						where: { id: input.categoryId }
					})
					if (!category || category.householdId !== householdId) {
						throw new TRPCError({
							code: 'BAD_REQUEST',
							message: i18n.t('categories.notFoundOrInvalid')
						})
					}
				}
			}

			// Handle recipient (optional)
			let finalRecipientId: string | undefined = input.recipientId

			if (input.newRecipientName) {
				const existingRecipient = await ctx.prisma.recipient.findUnique({
					where: {
						name_householdId: {
							name: input.newRecipientName,
							householdId: householdId
						}
					}
				})

				if (existingRecipient) {
					finalRecipientId = existingRecipient.id
				} else {
					const newRecipient = await ctx.prisma.recipient.create({
						data: {
							name: input.newRecipientName,
							householdId: householdId
						}
					})
					finalRecipientId = newRecipient.id
				}
			}

			return ctx.prisma.$transaction(async (tx) => {
				const transaction = await tx.transaction.create({
					data: {
						name: input.name,
						amount: input.amount,
						date: input.date,
						notes: input.notes,
						budgetId: budget?.id,
						accountId: input.accountId,
						categoryId: finalCategoryId,
						billId: input.billId,
						recipientId: finalRecipientId,
						incomeId: input.incomeId,
						splits:
							input.splits && input.splits.length > 0
								? {
										create: input.splits.map((s) => ({
											categoryId: s.categoryId,
											amount: s.amount,
											subtitle: s.subtitle
										}))
									}
								: undefined
					},
					include: {
						category: true,
						account: true,
						recipient: true,
						splits: {
							include: { category: true }
						}
					}
				})

				// If this transaction pays a bill, ensure we maintain the buffer of future bills
				if (input.billId) {
					// 1. Get the paid bill instance to find its series
					const paidBill = await tx.bill.findUnique({
						where: { id: input.billId },
						include: { recurringBill: true }
					})

					if (paidBill?.recurringBill) {
						const { recurringBill } = paidBill

						// 2. Find the last generated bill for this series
						const lastBill = await tx.bill.findFirst({
							where: { recurringBillId: recurringBill.id },
							orderBy: { dueDate: 'desc' }
						})

						if (lastBill) {
							// 3. Calculate the next due date based on the LAST bill
							let nextDate = new Date(lastBill.dueDate)
							switch (recurringBill.recurrenceType) {
								case RecurrenceType.WEEKLY:
									nextDate = addWeeks(nextDate, 1)
									break
								case RecurrenceType.MONTHLY:
									nextDate = addMonths(nextDate, 1)
									break
								case RecurrenceType.QUARTERLY:
									nextDate = addMonths(nextDate, 3)
									break
								case RecurrenceType.YEARLY:
									nextDate = addYears(nextDate, 1)
									break
								case RecurrenceType.CUSTOM:
									if (recurringBill.customIntervalDays) {
										nextDate = addDays(
											nextDate,
											recurringBill.customIntervalDays
										)
									}
									break
								case RecurrenceType.NONE:
									// No recurrence, no new bill
									return transaction
							}

							// 4. Create proper instance if strictly after last one (and check stop date)
							if (
								(!recurringBill.lastPaymentDate ||
									nextDate <= recurringBill.lastPaymentDate) &&
								nextDate > lastBill.dueDate
							) {
								await tx.bill.create({
									data: {
										dueDate: nextDate,
										amount: recurringBill.estimatedAmount,
										recurringBillId: recurringBill.id
									}
								})
							}
						}
					}
				}

				return transaction
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
				recipientId: z.string().nullable().optional(),
				incomeId: z.string().nullable().optional(),
				splits: z
					.array(
						z.object({
							categoryId: z.string(),
							amount: z.number().positive(),
							subtitle: z.string()
						})
					)
					.optional()
			})
		)
		.mutation(async ({ ctx, input }) => {
			// Get transaction with budget
			const transaction = await ctx.prisma.transaction.findUnique({
				where: { id: input.id },
				include: {
					budget: true,
					account: true
				}
			})

			if (!transaction) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: i18n.t('transactions.notFound')
				})
			}

			// Verify user has access to this household
			const householdId =
				transaction.budget?.householdId ?? transaction.account.householdId

			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: i18n.t('server.forbidden.transactionAccess')
				})
			}

			// If updating account, verify it's linked to the budget
			if (input.accountId && transaction.budgetId) {
				const accountLink = await ctx.prisma.budgetAccount.findFirst({
					where: {
						budgetId: transaction.budgetId,
						accountId: input.accountId
					}
				})

				if (!accountLink) {
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: i18n.t('server.badRequest.accountNotLinked')
					})
				}
			}

			// If updating category, verify it's linked to the budget
			if (input.categoryId && transaction.budgetId) {
				const categoryLink = await ctx.prisma.budgetCategory.findFirst({
					where: {
						budgetId: transaction.budgetId,
						categoryId: input.categoryId
					}
				})

				if (!categoryLink) {
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: i18n.t('server.badRequest.categoryNotLinked')
					})
				}
			}

			// Handle splits update if provided
			if (input.splits !== undefined) {
				return ctx.prisma.$transaction(async (tx) => {
					// 1. Update basic fields
					const updated = await tx.transaction.update({
						where: { id: input.id },
						data: {
							name: input.name,
							amount: input.amount,
							date: input.date,
							notes: input.notes,
							accountId: input.accountId,
							categoryId: input.categoryId, // Will be null if splits exist/are used
							incomeId: input.incomeId
							// billId not updateable here typically, or added if needed
						},
						include: {
							category: true,
							account: true,
							bill: true,
							splits: { include: { category: true } }
						}
					})

					// 2. Replace splits
					// Delete existing
					await tx.transactionSplit.deleteMany({
						where: { transactionId: input.id }
					})

					// Create new
					if (input.splits && input.splits.length > 0) {
						await tx.transactionSplit.createMany({
							data: input.splits.map((s) => ({
								transactionId: input.id,
								categoryId: s.categoryId,
								amount: s.amount,
								subtitle: s.subtitle
							}))
						})
					}

					return updated
				})
			}

			// Standard update without splits change
			return ctx.prisma.transaction.update({
				where: { id: input.id },
				data: {
					name: input.name,
					amount: input.amount,
					date: input.date,
					notes: input.notes,
					accountId: input.accountId,
					categoryId: input.categoryId,
					incomeId: input.incomeId
				},
				include: {
					category: true,
					account: true,
					bill: true,
					splits: { include: { category: true } }
				}
			})
		}),

	/**
	 * Delete a transaction
	 */
	delete: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				userId: z.string() // For access verification
			})
		)
		.mutation(async ({ ctx, input }) => {
			// Get transaction with budget
			const transaction = await ctx.prisma.transaction.findUnique({
				where: { id: input.id },
				include: {
					budget: true,
					account: true
				}
			})

			if (!transaction) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: i18n.t('transactions.notFound')
				})
			}

			// Verify user has access to this household
			const householdId =
				transaction.budget?.householdId ?? transaction.account.householdId

			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: i18n.t('transactions.notFound')
				})
			}

			await ctx.prisma.transaction.delete({
				where: { id: input.id }
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
				date: z.date().optional()
			})
		)
		.mutation(async ({ ctx, input }) => {
			// Get the original transaction
			const original = await ctx.prisma.transaction.findUnique({
				where: { id: input.id },
				include: { budget: true, account: true }
			})

			if (!original) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: i18n.t('transactions.notFound')
				})
			}

			// Verify user has access to this household
			const householdId =
				original.budget?.householdId ?? original.account.householdId

			const householdUser = await ctx.prisma.householdUser.findFirst({
				where: {
					householdId: householdId,
					userId: input.userId
				}
			})

			if (!householdUser) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Transaction not found'
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
					categoryId: original.categoryId
				},
				include: {
					category: true,
					account: true
				}
			})
		})
} satisfies TRPCRouterRecord
