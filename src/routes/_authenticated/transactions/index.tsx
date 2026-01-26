/**
 * Transactions page - Manage income and expense transactions
 */

import { createFileRoute, Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import { CopyIcon, MoreVerticalIcon, PencilIcon, TrashIcon } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'
import { CreateTransactionButton } from '@/components/transactions/CreateTransactionButton'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { CreateTransferButton } from '@/components/transfers/CreateTransferButton'
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
import { useAuth } from '@/contexts/auth-context'
import { TransferForm } from '@/forms/TransferForm'
import {
	useAccountsList,
	useBudgetsList,
	useCategoriesList,
	useCloneTransaction,
	useDeleteTransaction,
	useDeleteTransfer,
	useRecipientsList,
	useTransactionsList,
	useUpdateTransaction,
	useUpdateTransfer
} from '@/hooks/api'
import { useDrawer } from '@/hooks/use-drawer'

import { useSelectedBudget } from '@/hooks/use-selected-budget'
import { formatCurrency } from '@/lib/utils'

// Search params schema
const transactionsSearchSchema = z.object({
	budgetId: z.string().optional(),
	createFromBill: z.string().optional()
})

export const Route = createFileRoute('/_authenticated/transactions/')({
	component: TransactionsPage,
	validateSearch: (search) => transactionsSearchSchema.parse(search)
})

function TransactionsPage() {
	const { budgetId: urlBudgetId, createFromBill } = Route.useSearch()
	const { userId, householdId } = useAuth()
	const { selectedBudgetId } = useSelectedBudget(userId, householdId)
	const budgetId = urlBudgetId || selectedBudgetId
	const { openDrawer, closeDrawer } = useDrawer()
	const [filter, setFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL')

	// All hooks must be called before any early returns
	const {
		data: transactions,
		isLoading,
		refetch
	} = useTransactionsList({
		budgetId: budgetId ?? '',
		userId,
		type: filter === 'ALL' ? undefined : filter,
		enabled: !!budgetId
	})

	const { data: categories } = useCategoriesList({
		householdId,
		userId,
		budgetId: budgetId || undefined,
		enabled: !!budgetId
	})

	const { data: accounts } = useAccountsList({
		householdId,
		userId,
		budgetId: budgetId || undefined,
		enabled: !!budgetId,
		excludeArchived: true
	})

	const { data: recipients } = useRecipientsList({
		householdId,
		userId,
		enabled: !!householdId
	})

	const { data: budgets } = useBudgetsList({
		householdId,
		userId
	})

	const { mutate: updateTransaction } = useUpdateTransaction({
		onSuccess: () => {
			refetch()
			closeDrawer()
		}
	})

	const { mutate: deleteTransaction } = useDeleteTransaction({
		onSuccess: () => {
			refetch()
		}
	})

	const { mutate: cloneTransaction } = useCloneTransaction({
		onSuccess: () => {
			refetch()
		}
	})

	const { mutate: updateTransfer } = useUpdateTransfer({
		onSuccess: () => {
			refetch()
			closeDrawer()
		}
	})

	const { mutate: deleteTransfer } = useDeleteTransfer({
		onSuccess: () => {
			refetch()
		}
	})

	// Handlers for edit are still needed, but create handlers are extracted to buttons

	const handleEditTransaction = (transaction: any) => {
		const type = getTransactionType(transaction)
		openDrawer(
			<div className="p-4">
				<h2 className="text-2xl font-bold mb-4">Edit Transaction</h2>
				<p className="text-muted-foreground mb-6">
					Update transaction information
				</p>
				{categories && accounts ? (
					<TransactionForm
						defaultValues={{
							name: transaction.name,
							amount: transaction.amount,
							date: new Date(transaction.date),
							categoryId: transaction.categoryId,
							accountId: transaction.accountId,
							recipientId: transaction.recipientId ?? null,
							notes: transaction.notes ?? '',
							transactionType: type as 'INCOME' | 'EXPENSE',
							splits:
								transaction.splits && transaction.splits.length > 0
									? transaction.splits.map((s: any) => ({
											subtitle: s.subtitle,
											amount: s.amount,
											categoryId: s.categoryId
										}))
									: undefined
						}}
						categories={categories}
						accounts={accounts}
						recipients={recipients}
						budgets={budgets ?? []}
						isEditing={true}
						originalBillAmount={transaction.bill?.amount}
						onSubmit={async (data) => {
							// For updates, transform category to categoryId
							const categoryId =
								typeof data.category === 'string' ? data.category : undefined

							// Transform recipient field to API format for updates
							const recipientId = data.recipient
								? typeof data.recipient === 'string'
									? data.recipient
									: undefined // New recipients during edit not supported yet
								: null

							// Transform splits if present
							const splits = data.splits
								?.map((s) => ({
									subtitle: s.subtitle,
									amount: s.amount,
									categoryId:
										typeof s.category === 'string' ? s.category : undefined
									// Note: We currently don't handle new category creation within splits during edit
									// if the router doesn't support it. The form allows it, but we might need
									// to creating them first if needed, or rely on router update.
									// For now assuming existing categories as user reported switching valid categories.
								}))
								.filter((s) => s.categoryId) as Array<{
								subtitle: string
								amount: number
								categoryId: string
							}>

							updateTransaction({
								id: transaction.id,
								userId,
								name: data.name,
								amount: data.amount,
								date: data.date,
								accountId: data.accountId,
								notes: data.notes,
								categoryId,
								recipientId,
								splits
							})
						}}
						onCancel={closeDrawer}
						submitLabel="Update Transaction"
					/>
				) : (
					<div className="flex items-center justify-center p-8">
						<p className="text-muted-foreground">Loading form data...</p>
					</div>
				)}
			</div>,
			'Edit Transaction'
		)
	}

	const handleEditTransfer = (transfer: {
		id: string
		originalId: string
		amount: number
		date: Date
		fromAccountId: string
		toAccountId: string
		notes: string | null
	}) => {
		openDrawer(
			<div className="p-4">
				<h2 className="text-2xl font-bold mb-4">Edit Transfer</h2>
				<p className="text-muted-foreground mb-6">Update transfer details</p>
				{accounts ? (
					<TransferForm
						accounts={accounts}
						defaultValues={{
							amount: transfer.amount,
							date: transfer.date,
							notes: transfer.notes ?? '',
							fromAccountId: transfer.fromAccountId,
							toAccountId: transfer.toAccountId
						}}
						isEditing={true}
						onSubmit={(data) => {
							updateTransfer({
								id: transfer.originalId,
								userId,
								amount: data.amount,
								date: data.date,
								notes: data.notes,
								fromAccountId: data.fromAccountId,
								toAccountId: data.toAccountId
							})
						}}
						onCancel={closeDrawer}
						submitLabel="Update Transfer"
					/>
				) : (
					<div className="flex items-center justify-center p-8">
						<p className="text-muted-foreground">Loading accounts...</p>
					</div>
				)}
			</div>,
			'Edit Transfer'
		)
	}

	// Show message if no budget selected
	if (!budgetId) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>No Budget Selected</CardTitle>
					<CardDescription>
						Please select a budget to manage transactions
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

	if (isLoading) {
		return (
			<div className="flex items-center justify-center">
				<p className="text-muted-foreground">Loading transactions...</p>
			</div>
		)
	}

	// Helper to determine transaction type
	const getTransactionType = (t: any) => {
		// If splits exist, it's an EXPENSE
		if (t.splits && t.splits.length > 0) return 'EXPENSE'

		const types = t.category?.types || []
		if (types.includes('EXPENSE') && types.includes('INCOME')) {
			// Hybrid: assume Expense if budget linked, otherwise Income
			return t.budgetId ? 'EXPENSE' : 'INCOME'
		}
		// If explicitly INCOME, return INCOME. Otherwise default to EXPENSE (safer for uncategorized/splits)
		return types.includes('INCOME') ? 'INCOME' : 'EXPENSE'
	}

	const incomeTransactions = transactions?.filter(
		(t) => getTransactionType(t) === 'INCOME'
	)
	const expenseTransactions = transactions?.filter(
		(t) => getTransactionType(t) === 'EXPENSE'
	)
	const totalInitialBalance =
		accounts?.reduce((sum, a) => sum + a.initialBalance, 0) ?? 0
	const totalIncome =
		(incomeTransactions?.reduce((sum, t) => sum + t.amount, 0) ?? 0) +
		totalInitialBalance
	const totalExpense =
		expenseTransactions?.reduce((sum, t) => sum + t.amount, 0) ?? 0

	return (
		<div className="space-y-6">
			{/* Toolbar */}
			<div className="flex items-center justify-end gap-2">
				<CreateTransactionButton
					budgetId={budgetId}
					preSelectedBillId={createFromBill}
				/>
				<CreateTransferButton budgetId={budgetId} />
			</div>
			{/* Summary cards */}
			<div className="grid gap-4 md:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-medium">Total Income</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-green-600">
							{formatCurrency(totalIncome)}
						</div>
						<p className="text-xs text-muted-foreground">
							{incomeTransactions?.length ?? 0} transactions
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-medium">
							Total Expenses
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-red-600">
							{formatCurrency(totalExpense)}
						</div>
						<p className="text-xs text-muted-foreground">
							{expenseTransactions?.length ?? 0} transactions
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-medium">Net</CardTitle>
					</CardHeader>
					<CardContent>
						<div
							className={`text-2xl font-bold ${
								totalIncome - totalExpense >= 0
									? 'text-green-600'
									: 'text-red-600'
							}
;`}
						>
							{formatCurrency(totalIncome - totalExpense)}
						</div>
						<p className="text-xs text-muted-foreground">
							{transactions?.length ?? 0} total transactions
						</p>
					</CardContent>
				</Card>
			</div>
			{/* Filter tabs */}
			<div className="flex gap-2">
				<Button
					variant={filter === 'ALL' ? 'default' : 'outline'}
					onClick={() => setFilter('ALL')}
				>
					All ({transactions?.length ?? 0})
				</Button>
				<Button
					variant={filter === 'INCOME' ? 'default' : 'outline'}
					onClick={() => setFilter('INCOME')}
				>
					Income ({incomeTransactions?.length ?? 0})
				</Button>
				<Button
					variant={filter === 'EXPENSE' ? 'default' : 'outline'}
					onClick={() => setFilter('EXPENSE')}
				>
					Expenses ({expenseTransactions?.length ?? 0})
				</Button>
			</div>
			{/* Transactions list */}
			{transactions?.length === 0 ? (
				<Card>
					<CardHeader>
						<CardTitle>No transactions yet</CardTitle>
						<CardDescription>
							Get started by creating your first transaction
						</CardDescription>
					</CardHeader>
					<CardContent>
						<CreateTransactionButton
							budgetId={budgetId}
							preSelectedBillId={createFromBill}
							variant="default"
						>
							{/* We can't actually change text this way with current component,
                  but the standard button text is fine or we can add a text props if needed,
                  for now using default text "Add Transaction" is acceptable */}
						</CreateTransactionButton>
					</CardContent>
				</Card>
			) : (
				<Card>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Date</TableHead>
								<TableHead>Name</TableHead>
								<TableHead>Category</TableHead>
								<TableHead>Account</TableHead>
								<TableHead className="text-right">Amount</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{transactions?.map((transaction) => {
								const type = getTransactionType(transaction)
								const hasSplits =
									'splits' in transaction &&
									transaction.splits &&
									transaction.splits.length > 0

								return (
									<TableRow key={transaction.id}>
										<TableCell>
											{format(new Date(transaction.date), 'PP')}
										</TableCell>
										<TableCell className="font-medium">
											{transaction.name}
										</TableCell>
										<TableCell>
											{hasSplits ? (
												<Badge variant="outline">
													{transaction.splits.length} Splits
												</Badge>
											) : (
												<Badge
													variant={type === 'INCOME' ? 'default' : 'secondary'}
												>
													{transaction.category?.name || 'Uncategorized'}
												</Badge>
											)}
										</TableCell>
										<TableCell className="text-muted-foreground">
											{transaction.account.name}
										</TableCell>
										<TableCell
											className={`text-right font-medium ${
												type === 'INCOME' ? 'text-green-600' : 'text-red-600'
											}`}
										>
											{type === 'INCOME' ? '+' : '-'}
											{formatCurrency(transaction.amount)}
										</TableCell>
										<TableCell className="text-right">
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button variant="ghost" size="icon">
														<MoreVerticalIcon className="h-4 w-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													{(transaction as any).isTransfer ? (
														<>
															<DropdownMenuItem
																onClick={() =>
																	handleEditTransfer({
																		id: (transaction as any).id,
																		originalId: (transaction as any).originalId,
																		amount: transaction.amount,
																		date: new Date(transaction.date),
																		notes: transaction.notes,
																		fromAccountId: (transaction as any)
																			.fromAccountId,
																		toAccountId: (transaction as any)
																			.toAccountId
																	})
																}
															>
																<PencilIcon className="mr-2 h-4 w-4" />
																Edit Transfer
															</DropdownMenuItem>
															<DropdownMenuItem
																onClick={() => {
																	if (
																		confirm(
																			`Are you sure you want to delete this transfer?`
																		)
																	) {
																		deleteTransfer({
																			id: (transaction as any).originalId,
																			userId
																		})
																	}
																}}
																className="text-red-600"
															>
																<TrashIcon className="mr-2 h-4 w-4" />
																Delete Transfer
															</DropdownMenuItem>
														</>
													) : (
														<>
															<DropdownMenuItem
																onClick={() =>
																	handleEditTransaction(transaction)
																}
															>
																<PencilIcon className="mr-2 h-4 w-4" />
																Edit
															</DropdownMenuItem>
															<DropdownMenuItem
																onClick={() => {
																	if (
																		confirm(
																			`Clone transaction "${transaction.name}"?`
																		)
																	) {
																		cloneTransaction({
																			id: transaction.id,
																			userId
																		})
																	}
																}}
															>
																<CopyIcon className="mr-2 h-4 w-4" />
																Clone
															</DropdownMenuItem>
															<DropdownMenuItem
																className="text-red-600"
																onClick={() => {
																	if (
																		confirm(
																			`Are you sure you want to delete "${transaction.name}"?`
																		)
																	) {
																		deleteTransaction({
																			id: transaction.id,
																			userId
																		})
																	}
																}}
															>
																<TrashIcon className="mr-2 h-4 w-4" />
																Delete
															</DropdownMenuItem>
														</>
													)}
												</DropdownMenuContent>
											</DropdownMenu>
										</TableCell>
									</TableRow>
								)
							})}
						</TableBody>
					</Table>
				</Card>
			)}
		</div>
	)
}
