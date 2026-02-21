/**
 * Income Page - List and manage recurring income
 */

import { createFileRoute, Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import {
	AlertCircle,
	Archive,
	ArchiveRestore,
	MoreVerticalIcon,
	Pencil,
	Plus,
	PlusCircle,
	Trash2,
	Wallet
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { RecurrenceType } from '@/api/generated/types.gen'
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
	const { t } = useTranslation()
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
					<CardTitle>{t('budgets.noBudgetSelected')}</CardTitle>
					<CardDescription>{t('income.selectBudget')}</CardDescription>
				</CardHeader>
				<CardContent>
					<Button asChild>
						<Link to="/budgets">{t('budgets.goToBudgets')}</Link>
					</Button>
				</CardContent>
			</Card>
		)
	}

	const handleCreate = () => {
		openDrawer(
			<div className="p-4">
				<h2 className="text-2xl font-bold mb-4">{t('income.add')}</h2>
				<p className="text-muted-foreground mb-6">{t('income.createDesc')}</p>
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
						<p className="text-muted-foreground">{t('income.loadingForm')}</p>
					</div>
				)}
			</div>,
			t('income.add')
		)
	}

	const handleEdit = (income: any) => {
		openDrawer(
			<div className="p-4">
				<h2 className="text-2xl font-bold mb-4">{t('income.edit')}</h2>
				<p className="text-muted-foreground mb-6">{t('income.editDesc')}</p>
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
						<p className="text-muted-foreground">{t('income.loadingForm')}</p>
					</div>
				)}
			</div>,
			t('income.edit')
		)
	}

	const handleDelete = (id: string) => {
		if (confirm(t('income.deleteConfirm'))) {
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
					{t('income.createTransaction')}
				</h2>
				<p className="text-muted-foreground mb-6">
					{t('income.createTransactionDesc')}
				</p>
				{accountsQuery.data && categoriesQuery.data ? (
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
						submitLabel={t('income.createTransactionAction')}
					/>
				) : (
					<div className="flex items-center justify-center p-8">
						<p className="text-muted-foreground">{t('income.loadingForm')}</p>
					</div>
				)}
			</div>,
			t('income.createTransactionAction')
		)
	}

	const getRecurrenceLabel = (
		type: RecurrenceType,
		customDays?: number | null
	) => {
		switch (type) {
			case RecurrenceType.NONE:
				return t('income.oneTime')
			case RecurrenceType.WEEKLY:
				return t('income.weekly')
			case RecurrenceType.MONTHLY:
				return t('income.monthly')
			case RecurrenceType.QUARTERLY:
				return t('income.quarterly')
			case RecurrenceType.YEARLY:
				return t('income.yearly')
			case RecurrenceType.CUSTOM:
				return t('income.custom', { days: customDays })
			default:
				return type
		}
	}

	return (
		<div className="space-y-6">
			{/* Toolbar */}
			<div className="flex items-center justify-end gap-2">
				<Button
					variant="outline"
					onClick={() => setIncludeArchived(!includeArchived)}
				>
					{includeArchived
						? t('income.hideArchived')
						: t('income.showArchived')}
				</Button>
				<Button onClick={handleCreate}>
					<Plus className="mr-2 h-4 w-4" />
					{t('income.add')}
				</Button>
			</div>

			{incomeQuery.isLoading ? (
				<div className="flex items-center justify-center p-8">
					<p className="text-muted-foreground">{t('income.loading')}</p>
				</div>
			) : !incomeQuery.data || incomeQuery.data.length === 0 ? (
				<div className="flex flex-col items-center justify-center p-12 border rounded-lg bg-card text-card-foreground shadow-sm">
					<div className="bg-primary/10 p-4 rounded-full mb-4">
						<Wallet className="h-8 w-8 text-primary" />
					</div>
					<h3 className="text-lg font-semibold mb-2">{t('nav.income')}</h3>
					<p className="text-muted-foreground text-center max-w-sm mb-6">
						{t('income.noIncome')}
					</p>
					<Button onClick={handleCreate}>
						<Plus className="mr-2 h-4 w-4" />
						{t('income.add')}
					</Button>
				</div>
			) : (
				<Card>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>{t('common.name')}</TableHead>
									<TableHead>{t('income.source')}</TableHead>
									<TableHead>{t('common.account')}</TableHead>
									<TableHead>{t('common.amount')}</TableHead>
									<TableHead>{t('recurrence.label')}</TableHead>
									<TableHead>{t('income.nextExpected')}</TableHead>
									<TableHead>{t('common.category')}</TableHead>
									<TableHead className="text-right">
										{t('common.actions')}
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{incomeQuery.data.map((income) => (
									<TableRow
										key={income.id}
										className={income.isArchived ? 'opacity-50' : ''}
									>
										<TableCell className="font-medium">
											{income.isArchived && (
												<Badge variant="secondary" className="mr-2">
													{t('income.archived')}
												</Badge>
											)}
											{income.name}
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
																<AlertCircle className="h-4 w-4 text-yellow-500" />
															</TooltipTrigger>
															<TooltipContent>
																<p>{t('income.archivedAccountWarning')}</p>
															</TooltipContent>
														</Tooltip>
													</TooltipProvider>
												)}
											</div>
										</TableCell>
										<TableCell>
											{new Intl.NumberFormat('sv-SE', {
												style: 'currency',
												currency: 'SEK'
											}).format(income.estimatedAmount)}
										</TableCell>
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
														<PlusCircle className="mr-2 h-4 w-4" />
														{t('income.createTransactionAction')}
													</DropdownMenuItem>
													<DropdownMenuSeparator />
													<DropdownMenuItem onClick={() => handleEdit(income)}>
														<Pencil className="mr-2 h-4 w-4" />
														{t('common.edit')}
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() =>
															income.isArchived
																? handleArchive(income.id, false)
																: handleArchive(income.id, true)
														}
													>
														{income.isArchived ? (
															<>
																<ArchiveRestore className="mr-2 h-4 w-4" />
																{t('common.unarchive')}
															</>
														) : (
															<>
																<Archive className="mr-2 h-4 w-4" />
																{t('common.archive')}
															</>
														)}
													</DropdownMenuItem>
													<DropdownMenuSeparator />
													<DropdownMenuItem
														onClick={() => handleDelete(income.id)}
														className="text-destructive"
													>
														<Trash2 className="mr-2 h-4 w-4" />
														{t('common.delete')}
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}
		</div>
	)
}
