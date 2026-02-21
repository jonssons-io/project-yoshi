/**
 * Bills Page - List and manage bills
 */

import { createFileRoute, Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import {
	AlertTriangleIcon,
	ArchiveIcon,
	Edit2Icon,
	MoreVerticalIcon,
	PlusIcon,
	ReceiptIcon,
	TrashIcon
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { BillForm, type BillFormData } from '@/components/bills/BillForm'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger
} from '@/components/ui/tooltip'
import { useAuth } from '@/contexts/auth-context'
import { RecurrenceType } from '@/api/generated/types.gen'
import {
	useAccountsList,
	useArchiveBill,
	useBillsList,
	useBudgetsList, // Added
	useCategoriesList,
	useCreateBill,
	useCreateTransaction,
	useDeleteBill,
	useRecipientsList,
	useUpdateBill
} from '@/hooks/api'
import { useDrawer } from '@/hooks/use-drawer'
import { useSelectedBudget } from '@/hooks/use-selected-budget'

// Search params schema
const billsSearchSchema = z.object({
	budgetId: z.string().optional()
})

export const Route = createFileRoute('/_authenticated/bills/')({
	component: BillsPage,
	validateSearch: (search) => billsSearchSchema.parse(search)
})

function BillsPage() {
	const { t } = useTranslation()
	const { budgetId: urlBudgetId } = Route.useSearch()
	const { userId, householdId } = useAuth()
	const { selectedBudgetId } = useSelectedBudget(userId, householdId)
	const budgetId = urlBudgetId || selectedBudgetId
	const { openDrawer, closeDrawer } = useDrawer()
	// const navigate = useNavigate()

	const [thisMonthOnly, setThisMonthOnly] = useState(false)
	const [includeArchived, setIncludeArchived] = useState(false)

	// If no budgetId, show message to select one

	// Fetch bills
	const billsQuery = useBillsList({
		budgetId,
		userId,
		thisMonthOnly,
		includeArchived
	})

	// Fetch accounts for form
	const accountsQuery = useAccountsList({
		householdId,
		userId,
		budgetId: budgetId,
		excludeArchived: true // Don't show archived accounts in selection dropdowns
	})

	// Fetch categories for form (expense categories only)
	const categoriesQuery = useCategoriesList({
		householdId,
		userId,
		type: 'EXPENSE'
	})

	const { data: recipientsData } = useRecipientsList({
		householdId,
		userId,
		enabled: !!budgetId
	})
	const recipients = recipientsData ?? []

	const { data: budgets } = useBudgetsList({
		householdId,
		userId
	})

	// Categories are already filtered for EXPENSE type in the query
	const expenseCategories = categoriesQuery.data ?? []

	// Create mutation
	const createMutation = useCreateBill({
		onSuccess: () => {
			billsQuery.refetch()
			closeDrawer()
		}
	})

	// Create transaction mutation
	const createTransactionMutation = useCreateTransaction({
		onSuccess: () => {
			closeDrawer()
			billsQuery.refetch()
		}
	})

	// Update mutation
	const updateMutation = useUpdateBill({
		onSuccess: () => {
			billsQuery.refetch()
			closeDrawer()
		}
	})

	// Delete mutation
	const deleteMutation = useDeleteBill({
		onSuccess: () => {
			billsQuery.refetch()
		}
	})

	// Archive mutation
	const archiveMutation = useArchiveBill({
		onSuccess: () => {
			billsQuery.refetch()
		}
	})

	if (!budgetId) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>{t('bills.noBudgetSelected')}</CardTitle>
					<CardDescription>{t('bills.selectBudget')}</CardDescription>
				</CardHeader>
				<CardContent>
					<Button asChild>
						<Link to="/budgets">{t('bills.goToBudgets')}</Link>
					</Button>
				</CardContent>
			</Card>
		)
	}

	const handleCreate = () => {
		openDrawer(
			<div className="p-4">
				<h2 className="text-2xl font-bold mb-4">{t('bills.createBill')}</h2>
				<p className="text-muted-foreground mb-6">
					{t('bills.createBillDesc')}
				</p>
				{accountsQuery.data && categoriesQuery.data ? (
					<BillForm
						onSubmit={(data) => {
							// Handle splits
							const splitsData = data.splits
								?.map((s) => {
									const categoryId =
										typeof s.category === 'string' ? s.category : undefined
									const newCategoryName =
										typeof s.category === 'object' && s.category.isNew
											? s.category.name
											: undefined
									return {
										subtitle: s.subtitle,
										amount: s.amount,
										categoryId,
										newCategoryName
									}
								})
								.filter((s) => s.categoryId || s.newCategoryName)

							// Transform recipient field (union) to API format (string)
							const recipientValue = data.recipient
							let recipientName = ''
							if (typeof recipientValue === 'string') {
								const match = recipients.find((r) => r.id === recipientValue)
								recipientName = match ? match.name : recipientValue
							} else {
								recipientName = recipientValue.name
							}

							createMutation.mutate({
								name: data.name,
								recipient: recipientName,
								accountId: data.accountId,
								startDate: data.startDate,
								recurrenceType: data.recurrenceType,
								customIntervalDays: data.customIntervalDays,
								estimatedAmount: data.splits.reduce(
									(sum, s) => sum + s.amount,
									0
								),
								lastPaymentDate: data.lastPaymentDate || undefined,
								budgetId: budgetId!,
								userId,
								splits: splitsData
							})
						}}
						onCancel={closeDrawer}
						accounts={accountsQuery.data}
						categories={expenseCategories}
						recipients={recipients}
						isSubmitting={createMutation.isPending}
					/>
				) : (
					<div className="flex items-center justify-center p-8">
						<p className="text-muted-foreground">{t('common.loading')}</p>
					</div>
				)}
			</div>,
			t('bills.createBill')
		)
	}

	const handleUpdate = (bill: any) => {
		openDrawer(
			<div className="p-4">
				<h2 className="text-2xl font-bold mb-4">{t('bills.editBill')}</h2>
				<p className="text-muted-foreground mb-6">{t('bills.editBillDesc')}</p>
				{accountsQuery.data && categoriesQuery.data ? (
					<BillForm
						initialData={{
							name: bill.name,
							recipient: bill.recipient,
							accountId: bill.account.id, // Account object is in bill
							startDate: new Date(bill.startDate),
							recurrenceType: bill.recurrenceType,
							customIntervalDays: bill.customIntervalDays,
							estimatedAmount: bill.amount,
							categoryId: bill.category?.id,
							splits: bill.splits?.map((s: any) => ({
								subtitle: s.subtitle,
								amount: s.amount,
								categoryId: s.category.id
							}))
						}}
						onSubmit={(data) => {
							// Transform to API format
							const recipientValue = data.recipient
							let recipientName = ''
							if (typeof recipientValue === 'string') {
								const match = recipients.find((r) => r.id === recipientValue)
								recipientName = match ? match.name : recipientValue
							} else {
								recipientName = recipientValue.name
							}

							const splitsData = data.splits
								?.map((s) => {
									const categoryId =
										typeof s.category === 'string' ? s.category : undefined
									const newCategoryName =
										typeof s.category === 'object' && s.category.isNew
											? s.category.name
											: undefined
									return {
										subtitle: s.subtitle,
										amount: s.amount,
										categoryId,
										newCategoryName
									}
								})
								.filter((s) => s.categoryId || s.newCategoryName)

							updateMutation.mutate({
								id: bill.recurringBillId, // Update the series
								userId,
								name: data.name,
								recipient: recipientName,
								accountId: data.accountId,
								startDate: data.startDate,
								recurrenceType: data.recurrenceType,
								customIntervalDays: data.customIntervalDays,
								estimatedAmount: data.splits.reduce(
									(sum, s) => sum + s.amount,
									0
								),
								lastPaymentDate: data.lastPaymentDate,
								// categoryId, // No longer used as top-level
								splits: splitsData
							})
						}}
						onCancel={closeDrawer}
						accounts={accountsQuery.data}
						categories={expenseCategories}
						recipients={recipients}
						isSubmitting={updateMutation.isPending}
					/>
				) : (
					<div className="flex items-center justify-center p-8">
						<p className="text-muted-foreground">{t('common.loading')}</p>
					</div>
				)}
			</div>,
			t('bills.editBill')
		)
	}

	const handleDelete = (id: string) => {
		if (confirm(t('bills.deleteConfirm'))) {
			deleteMutation.mutate({ id, userId })
		}
	}

	const handleArchive = (id: string, archived: boolean) => {
		archiveMutation.mutate({ id, archived, userId })
	}

	const handleCreateTransaction = (bill: any) => {
		openDrawer(
			<div className="p-4">
				<h2 className="text-2xl font-bold mb-4">{t('bills.payBill')}</h2>
				<p className="text-muted-foreground mb-6">{t('bills.payBillDesc')}</p>
				<TransactionForm
					categories={categoriesQuery.data ?? []}
					accounts={accountsQuery.data ?? []}
					recipients={recipients ?? []}
					budgets={budgets ?? []}
					bills={[{ id: bill.id, name: bill.name, recipient: bill.recipient }]}
					defaultValues={{
						name: bill.name,
						amount: bill.amount,
						date: new Date(bill.dueDate),
						categoryId: bill.category?.id, // Flattened
						accountId: bill.account.id, // Flattened
						transactionType: 'EXPENSE',
						recipient: (() => {
							if (!recipients) return undefined
							const match = recipients.find((r) => r.name === bill.recipient)
							if (match) return match.id
							return { isNew: true, name: bill.recipient }
						})(),
						notes: `Payment for ${bill.name}`,
						billId: bill.id, // Logic requires linking to the Instance
						splits: bill.splits?.map((s: any) => ({
							subtitle: s.subtitle,
							amount: s.amount,
							categoryId: s.category.id
						}))
					}}
					onSubmit={(data) => {
						// ... transformation logic ...
						const categoryData =
							typeof data.category === 'string' && data.category
								? { categoryId: data.category }
								: data.category
									? {
											newCategory: {
												name: data.category.name,
												type: data.transactionType
											}
										}
									: {}

						// Handle splits for transaction
						const splitsData = data.splits
							?.map((s) => ({
								subtitle: s.subtitle,
								amount: s.amount,
								categoryId: typeof s.category === 'string' ? s.category : ''
							}))
							.filter((s) => s.categoryId)

						const recipientData = data.recipient
							? typeof data.recipient === 'string'
								? { recipientId: data.recipient }
								: { newRecipientName: data.recipient.name }
							: {}

						createTransactionMutation.mutate({
							name: data.name,
							amount: data.amount,
							date: data.date,
							accountId: data.accountId,
							notes: data.notes,
							...categoryData,
							...recipientData,
							billId: data.billId || undefined,
							budgetId: budgetId!,
							userId,
							splits: splitsData
						})
					}}
					onCancel={closeDrawer}
					submitLabel={t('transactions.createTransaction')}
				/>
			</div>,
			t('transactions.createTransaction')
		)
	}

	const getRecurrenceLabel = (
		type: RecurrenceType,
		customDays?: number | null
	) => {
		switch (type) {
			case RecurrenceType.NONE:
				return t('recurrence.none')
			case RecurrenceType.WEEKLY:
				return t('recurrence.weekly')
			case RecurrenceType.MONTHLY:
				return t('recurrence.monthly')
			case RecurrenceType.QUARTERLY:
				return t('recurrence.quarterly')
			case RecurrenceType.YEARLY:
				return t('recurrence.yearly')
			case RecurrenceType.CUSTOM:
				return t('recurrence.custom')
			default:
				return type
		}
	}

	return (
		<div className="space-y-6">
			{/* Toolbar */}
			<div className="flex items-center justify-end gap-2">
				<Button
					variant={thisMonthOnly ? 'default' : 'outline'}
					onClick={() => setThisMonthOnly(!thisMonthOnly)}
					size="sm"
				>
					{t('bills.thisMonth')}
				</Button>
				<Button
					variant={includeArchived ? 'default' : 'outline'}
					onClick={() => setIncludeArchived(!includeArchived)}
					size="sm"
				>
					{includeArchived ? t('bills.hideArchived') : t('bills.showArchived')}
				</Button>
				<Button onClick={handleCreate}>
					<PlusIcon className="h-4 w-4 mr-2" />
					{t('bills.newBill')}
				</Button>
			</div>
			<Card>
				<CardContent>
					{billsQuery.isLoading ? (
						<div className="text-center py-8 text-muted-foreground">
							{t('common.loading')}
						</div>
					) : billsQuery.data?.length === 0 ? (
						<div className="text-center py-8 text-muted-foreground">
							{t('bills.noBills')}
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>{t('common.name')}</TableHead>
									<TableHead>{t('common.recipient')}</TableHead>
									<TableHead>{t('common.account')}</TableHead>
									<TableHead>{t('common.amount')}</TableHead>
									<TableHead>{t('recurrence.label')}</TableHead>
									<TableHead>{t('forms.nextExpectedDate')}</TableHead>
									<TableHead>{t('common.category')}</TableHead>
									<TableHead className="text-right">
										{t('common.actions')}
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{billsQuery.data?.map((bill) => {
									const isOverdue =
										!bill.isPaid &&
										new Date(bill.dueDate) < new Date() &&
										!bill.isArchived

									const hasSplits = bill.splits && bill.splits.length > 0

									return (
										<TableRow
											key={bill.id}
											className={bill.isArchived ? 'opacity-50' : ''}
										>
											<TableCell className="font-medium">
												{bill.name}
												{bill.isArchived && (
													<Badge variant="secondary" className="ml-2">
														{t('common.archived')}
													</Badge>
												)}
											</TableCell>
											<TableCell>{bill.recipient}</TableCell>
											<TableCell>
												<div className="flex items-center gap-2">
													{bill.account.name}
													{/* @ts-ignore - isArchived may not be in type definition yet but is in API response */}
													{bill.account.isArchived && (
														<TooltipProvider>
															<Tooltip>
																<TooltipTrigger>
																	<AlertTriangleIcon className="h-4 w-4 text-yellow-500" />
																</TooltipTrigger>
																<TooltipContent>
																	<p>{t('bills.archivedAccountWarning')}</p>
																</TooltipContent>
															</Tooltip>
														</TooltipProvider>
													)}
												</div>
											</TableCell>
											<TableCell>
												{bill.isPaid && bill.paidAmount ? (
													<TooltipProvider>
														<Tooltip>
															<TooltipTrigger className="cursor-help underline decoration-dotted underline-offset-2 decoration-green-500">
																${bill.paidAmount.toFixed(2)}
															</TooltipTrigger>
															<TooltipContent>
																<p>
																	{t('bills.paidTooltip', {
																		amount: bill.amount.toFixed(2)
																	})}
																</p>
															</TooltipContent>
														</Tooltip>
													</TooltipProvider>
												) : (
													`$${bill.amount.toFixed(2)}`
												)}
											</TableCell>
											<TableCell>
												{getRecurrenceLabel(
													bill.recurrenceType,
													bill.customIntervalDays
												)}
											</TableCell>
											<TableCell>
												{bill.isPaid ? (
													<Badge
														variant="outline"
														className="bg-green-50 text-green-700 border-green-200"
													>
														{t('bills.paid')}
													</Badge>
												) : isOverdue ? (
													<div className="flex flex-col">
														<span className="text-destructive font-bold">
															{format(new Date(bill.dueDate), 'MMM d, yyyy')}
														</span>
														<Badge
															variant="destructive"
															className="w-fit mt-1 text-[10px] px-1 py-0 h-4"
														>
															{t('bills.overdue')}
														</Badge>
													</div>
												) : (
													format(new Date(bill.dueDate), 'MMM d, yyyy')
												)}
											</TableCell>
											<TableCell>
												{hasSplits ? (
													<TooltipProvider>
														<Tooltip>
															<TooltipTrigger asChild>
																<Badge
																	variant="outline"
																	className="cursor-help"
																>
																	{bill.splits.length} {t('bills.sections')}
																</Badge>
															</TooltipTrigger>
															<TooltipContent className="w-64 p-0">
																<div className="p-2 space-y-2">
																	<p className="font-semibold text-xs border-b pb-1">
																		{t('bills.sections')}
																	</p>
																	{bill.splits.map((s: any, i: number) => (
																		<div
																			key={`${i}-${s.amount}`}
																			className="flex justify-between text-xs"
																		>
																			<span>
																				{s.subtitle || s.category.name}
																			</span>
																			<span>${s.amount.toFixed(2)}</span>
																		</div>
																	))}
																</div>
															</TooltipContent>
														</Tooltip>
													</TooltipProvider>
												) : (
													bill.category?.name
												)}
											</TableCell>
											<TableCell className="text-right">
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button variant="ghost" size="sm">
															<MoreVerticalIcon className="h-4 w-4" />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														{!bill.isPaid && (
															<>
																<DropdownMenuItem
																	onClick={() => handleCreateTransaction(bill)}
																>
																	<ReceiptIcon className="h-4 w-4 mr-2" />
																	{t('bills.payBill')}
																</DropdownMenuItem>
																<DropdownMenuSeparator />
															</>
														)}
														<DropdownMenuItem
															onClick={() => handleUpdate(bill)}
														>
															<Edit2Icon className="h-4 w-4 mr-2" />
															{t('common.edit')}
														</DropdownMenuItem>
														<DropdownMenuItem
															onClick={() =>
																handleArchive(
																	bill.recurringBillId,
																	!bill.isArchived
																)
															}
														>
															<ArchiveIcon className="h-4 w-4 mr-2" />
															{bill.isArchived
																? t('common.unarchive')
																: t('common.archive')}
														</DropdownMenuItem>
														<DropdownMenuSeparator />
														<DropdownMenuItem
															onClick={() => handleDelete(bill.recurringBillId)}
															className="text-destructive"
														>
															<TrashIcon className="h-4 w-4 mr-2" />
															{t('common.delete')}
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											</TableCell>
										</TableRow>
									)
								})}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
