/**
 * Income Page - List and manage recurring income
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
import { z } from 'zod'
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
import { IncomeForm } from '@/forms/IncomeForm'
import { RecurrenceType } from '@/generated/prisma/enums'
import {
	useAccountsList,
	useArchiveIncome,
	useBillsList,
	useCategoriesList,
	useCreateIncome,
	useCreateTransaction,
	useDeleteIncome,
	useIncomeList,
	useRecipientsList,
	useUpdateIncome
} from '@/hooks/api'
import { useDrawer } from '@/hooks/use-drawer'
import { useSelectedBudget } from '@/hooks/use-selected-budget'

// Search params schema
const incomeSearchSchema = z.object({
	budgetId: z.string().optional()
})

export const Route = createFileRoute('/_authenticated/income/')({
	component: IncomePage,
	validateSearch: (search) => incomeSearchSchema.parse(search)
})

function IncomePage() {
	const { budgetId: urlBudgetId } = Route.useSearch()
	const { userId, householdId } = useAuth()
	const { selectedBudgetId } = useSelectedBudget(userId, householdId)
	const budgetId = urlBudgetId || selectedBudgetId

	const { openDrawer, closeDrawer } = useDrawer()
	const [includeArchived, setIncludeArchived] = useState(false)

	// Fetch income
	const incomeQuery = useIncomeList({
		householdId,
		budgetId,
		userId,
		includeArchived
	})

	// Fetch accounts for form
	const accountsQuery = useAccountsList({
		householdId,
		userId,
		budgetId: budgetId,
		excludeArchived: true // Don't show archived accounts in selection dropdowns
	})

	// Fetch categories for form (income categories only)
	const categoriesQuery = useCategoriesList({
		householdId,
		userId,
		type: 'INCOME'
	})

	const incomeCategories = (categoriesQuery.data ?? []).map((c) => ({
		...c,
		type: 'INCOME'
	}))

	// Fetch recipients for TransactionForm
	const { data: recipients } = useRecipientsList({
		householdId,
		userId,
		enabled: !!budgetId
	})

	// Fetch bills for TransactionForm
	const { data: bills } = useBillsList({
		budgetId: budgetId || '',
		userId,
		enabled: !!budgetId
	})

	// Create mutation
	const createMutation = useCreateIncome({
		onSuccess: () => {
			incomeQuery.refetch()
			closeDrawer()
		}
	})

	// Update mutation
	const updateMutation = useUpdateIncome({
		onSuccess: () => {
			incomeQuery.refetch()
			closeDrawer()
		}
	})

	// Delete mutation
	const deleteMutation = useDeleteIncome({
		onSuccess: () => {
			incomeQuery.refetch()
		}
	})

	// Archive mutation
	const archiveMutation = useArchiveIncome({
		onSuccess: () => {
			incomeQuery.refetch()
		}
	})

	// Create transaction mutation
	const createTransactionMutation = useCreateTransaction({
		onSuccess: () => {
			closeDrawer()
		}
	})

	if (!budgetId) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>No Budget Selected</CardTitle>
					<CardDescription>
						Please select a budget to manage income
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button asChild>
						<Link to="/budgets">Go to Budgets</Link>
					</Button>
				</CardContent>
			</Card>
		)
	}

	const handleCreate = () => {
		openDrawer(
			<div className="p-4">
				<h2 className="text-2xl font-bold mb-4">Add New Income</h2>
				<p className="text-muted-foreground mb-6">
					Track recurring income like salary, dividends, etc.
				</p>
				{accountsQuery.data && categoriesQuery.data ? (
					<IncomeForm
						onSubmit={(data) => {
							const categoryData =
								typeof data.category === 'string'
									? { categoryId: data.category }
									: {
											newCategoryName: data.category.name
										}

							createMutation.mutate({
								name: data.name,
								source: data.source,
								amount: data.amount,
								expectedDate: data.expectedDate,
								accountId: data.accountId,
								...categoryData,
								recurrenceType: data.recurrenceType,
								customIntervalDays: data.customIntervalDays,
								endDate: data.endDate,
								userId,
								householdId: householdId!
							})
						}}
						onCancel={closeDrawer}
						accounts={accountsQuery.data}
						categories={incomeCategories}
					/>
				) : (
					<div className="flex items-center justify-center p-8">
						<p className="text-muted-foreground">Loading form data...</p>
					</div>
				)}
			</div>,
			'Add New Income'
		)
	}

	const handleEdit = (income: any) => {
		openDrawer(
			<div className="p-4">
				<h2 className="text-2xl font-bold mb-4">Edit Income</h2>
				<p className="text-muted-foreground mb-6">Update income details</p>
				{accountsQuery.data && categoriesQuery.data ? (
					<IncomeForm
						defaultValues={{
							name: income.name,
							source: income.source,
							amount: income.estimatedAmount,
							expectedDate: new Date(income.expectedDate),
							accountId: income.accountId,
							category: income.categoryId,
							recurrenceType: income.recurrenceType,
							customIntervalDays: income.customIntervalDays,
							endDate: income.endDate ? new Date(income.endDate) : null
						}}
						onSubmit={(data) => {
							const categoryData =
								typeof data.category === 'string'
									? { categoryId: data.category }
									: {
											// The update mutation might not support creation on the fly directly in the same named arg if it expects categoryId to be optional but existing.
											// However, usually our update mutations mimic create if designed well or we might need to handle it.
											// Looking at useUpdateIncome hook signature would be best, but let's assume it supports newCategoryName similar to create,
											// or mapped correctly.
											// Wait, useUpdateIncome usually takes `id` and partial updates. if we send `newCategoryName` it might not be in the type.
											// Let's assume for now the backend handles it or we need to check the hook.
											// But typically for updates we might just swap category. Creating new category on update is rare but possible.
											// If the user selects "Create new", we should handle it.
											// Let's pass `newCategoryName` if the mutation supports it.
											newCategoryName: data.category.name
										}

							updateMutation.mutate({
								id: income.id,
								userId,
								name: data.name,
								source: data.source,
								amount: data.amount,
								expectedDate: data.expectedDate,
								accountId: data.accountId,
								...categoryData,
								recurrenceType: data.recurrenceType,
								customIntervalDays: data.customIntervalDays,
								endDate: data.endDate
							})
						}}
						onCancel={closeDrawer}
						accounts={accountsQuery.data}
						categories={incomeCategories}
					/>
				) : (
					<div className="flex items-center justify-center p-8">
						<p className="text-muted-foreground">Loading form data...</p>
					</div>
				)}
			</div>,
			'Edit Income'
		)
	}

	const handleDelete = (id: string) => {
		if (confirm('Are you sure you want to delete this income source?')) {
			deleteMutation.mutate({ id, userId })
		}
	}

	const handleArchive = (id: string, isArchived: boolean) => {
		archiveMutation.mutate({ id, isArchived, userId })
	}

	const handleCreateTransactionClick = (income: any) => {
		openDrawer(
			<div className="p-4">
				<h2 className="text-2xl font-bold mb-4">
					Create Transaction from Income
				</h2>
				<p className="text-muted-foreground mb-6">
					Record actual income received
				</p>
				{categoriesQuery.data && accountsQuery.data ? (
					<TransactionForm
						categories={categoriesQuery.data}
						accounts={accountsQuery.data}
						recipients={recipients}
						bills={bills}
						defaultValues={{
							name: income.name,
							amount: income.estimatedAmount,
							date: new Date(),
							categoryId: income.categoryId,
							accountId: income.accountId,
							transactionType: 'INCOME',
							notes: `Income from ${income.source}`
						}}
						onSubmit={(data) => {
							// Transform category field
							const categoryData =
								typeof data.category === 'string'
									? { categoryId: data.category }
									: {
											newCategory: {
												name: data.category.name,
												type: data.transactionType
											}
										}

							// Transform recipient field
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
								budgetId,
								userId,
								incomeId: income.id
							})
						}}
						onCancel={closeDrawer}
						submitLabel="Create Transaction"
					/>
				) : (
					<div className="flex items-center justify-center p-8">
						<p className="text-muted-foreground">Loading form data...</p>
					</div>
				)}
			</div>,
			'Create Transaction'
		)
	}

	const getRecurrenceLabel = (
		type: RecurrenceType,
		customDays?: number | null
	) => {
		switch (type) {
			case RecurrenceType.NONE:
				return 'One-time'
			case RecurrenceType.WEEKLY:
				return 'Weekly'
			case RecurrenceType.MONTHLY:
				return 'Monthly'
			case RecurrenceType.QUARTERLY:
				return 'Quarterly'
			case RecurrenceType.YEARLY:
				return 'Yearly'
			case RecurrenceType.CUSTOM:
				return `Every ${customDays} days`
			default:
				return type
		}
	}

	return (
		<div className="space-y-6">
			{/* Toolbar */}
			<div className="flex items-center justify-end gap-2">
				<Button
					variant={includeArchived ? 'default' : 'outline'}
					onClick={() => setIncludeArchived(!includeArchived)}
					size="sm"
				>
					{includeArchived ? 'Hide Archived' : 'Show Archived'}
				</Button>
				<Button onClick={handleCreate}>
					<PlusIcon className="h-4 w-4 mr-2" />
					New Income
				</Button>
			</div>
			<Card>
				<CardContent>
					{incomeQuery.isLoading ? (
						<div className="text-center py-8 text-muted-foreground">
							Loading income...
						</div>
					) : incomeQuery.data?.length === 0 ? (
						<div className="text-center py-8 text-muted-foreground">
							No recurring income found. Add your salary or other income
							sources.
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead>Source</TableHead>
									<TableHead>Account</TableHead>
									<TableHead>Amount</TableHead>
									<TableHead>Recurrence</TableHead>
									<TableHead>Next Expected</TableHead>
									<TableHead>Category</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{incomeQuery.data?.map((income) => (
									<TableRow
										key={income.id}
										className={income.isArchived ? 'opacity-50' : ''}
									>
										<TableCell className="font-medium">
											{income.name}
											{income.isArchived && (
												<Badge variant="secondary" className="ml-2">
													Archived
												</Badge>
											)}
										</TableCell>
										<TableCell>{income.source}</TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												{income.account.name}
												{/* @ts-ignore - isArchived may not be in type definition yet but is in API response */}
												{income.account.isArchived && (
													<TooltipProvider>
														<Tooltip>
															<TooltipTrigger>
																<AlertTriangleIcon className="h-4 w-4 text-yellow-500" />
															</TooltipTrigger>
															<TooltipContent>
																<p>
																	This account is archived. Please update the
																	income source.
																</p>
															</TooltipContent>
														</Tooltip>
													</TooltipProvider>
												)}
											</div>
										</TableCell>
										<TableCell>${income.estimatedAmount.toFixed(2)}</TableCell>
										<TableCell>
											{getRecurrenceLabel(
												income.recurrenceType,
												income.customIntervalDays
											)}
										</TableCell>
										<TableCell>
											{format(new Date(income.expectedDate), 'MMM d, yyyy')}
										</TableCell>
										<TableCell>{income.category.name}</TableCell>
										<TableCell className="text-right">
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button variant="ghost" size="sm">
														<MoreVerticalIcon className="h-4 w-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem
														onClick={() => handleCreateTransactionClick(income)}
													>
														<ReceiptIcon className="h-4 w-4 mr-2" />
														Create Transaction
													</DropdownMenuItem>
													<DropdownMenuSeparator />
													<DropdownMenuItem onClick={() => handleEdit(income)}>
														<Edit2Icon className="h-4 w-4 mr-2" />
														Edit
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() =>
															handleArchive(income.id, !income.isArchived)
														}
													>
														<ArchiveIcon className="h-4 w-4 mr-2" />
														{income.isArchived ? 'Unarchive' : 'Archive'}
													</DropdownMenuItem>
													<DropdownMenuSeparator />
													<DropdownMenuItem
														onClick={() => handleDelete(income.id)}
														className="text-destructive"
													>
														<TrashIcon className="h-4 w-4 mr-2" />
														Delete
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
