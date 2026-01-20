/**
 * Transactions page - Manage income and expense transactions
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import {
	CopyIcon,
	MoreVerticalIcon,
	PencilIcon,
	PlusIcon,
	TrashIcon,
} from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/auth-context";
import {
	useAccountsList,
	useBillById,
	useBillsList,
	useCategoriesList,
	useCloneTransaction,
	useCreateBill,
	useCreateTransaction,
	useDeleteTransaction,
	useTransactionsList,
	useUpdateTransaction,
} from "@/hooks/api";
import { useSelectedBudget } from "@/hooks/use-selected-budget";
import { formatCurrency } from "@/lib/utils";

// Search params schema
const transactionsSearchSchema = z.object({
	budgetId: z.string().optional(),
	createFromBill: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/transactions/")({
	component: TransactionsPage,
	validateSearch: (search) => transactionsSearchSchema.parse(search),
});

function TransactionsPage() {
	const { budgetId: urlBudgetId, createFromBill } = Route.useSearch();
	const { userId, householdId } = useAuth();
	const { selectedBudgetId } = useSelectedBudget(userId, householdId);
	const budgetId = urlBudgetId || selectedBudgetId;
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [editingTransaction, setEditingTransaction] = useState<{
		id: string;
		name: string;
		amount: number;
		date: Date;
		categoryId: string;
		accountId: string;
		notes: string | null;
	} | null>(null);
	const [filter, setFilter] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");

	// All hooks must be called before any early returns
	const {
		data: transactions,
		isLoading,
		refetch,
	} = useTransactionsList({
		budgetId: budgetId ?? "",
		userId,
		type: filter === "ALL" ? undefined : filter,
		enabled: !!budgetId,
	});

	const { data: categories } = useCategoriesList({
		householdId,
		userId,
		budgetId: budgetId || undefined,
		enabled: !!budgetId,
	});

	const { data: accounts } = useAccountsList({
		householdId,
		userId,
		budgetId: budgetId || undefined,
		enabled: !!budgetId,
	});

	const { data: bills } = useBillsList({
		budgetId: budgetId ?? "",
		userId,
		includeArchived: false,
		enabled: !!budgetId,
	});

	const { data: selectedBill } = useBillById({
		billId: createFromBill,
		enabled: !!createFromBill,
	});

	const { mutate: createTransaction } = useCreateTransaction({
		onSuccess: () => {
			refetch();
			setCreateDialogOpen(false);
		},
	});

	const { mutate: createBill } = useCreateBill({});

	const { mutate: updateTransaction } = useUpdateTransaction({
		onSuccess: () => {
			refetch();
			setEditingTransaction(null);
		},
	});

	const { mutate: deleteTransaction } = useDeleteTransaction({
		onSuccess: () => {
			refetch();
		},
	});

	const { mutate: cloneTransaction } = useCloneTransaction({
		onSuccess: () => {
			refetch();
		},
	});

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
		);
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center">
				<p className="text-muted-foreground">Loading transactions...</p>
			</div>
		);
	}

	const incomeTransactions = transactions?.filter(
		(t) => t.category.type === "INCOME",
	);
	const expenseTransactions = transactions?.filter(
		(t) => t.category.type === "EXPENSE",
	);
	const totalIncome =
		incomeTransactions?.reduce((sum, t) => sum + t.amount, 0) ?? 0;
	const totalExpense =
		expenseTransactions?.reduce((sum, t) => sum + t.amount, 0) ?? 0;

	return (
		<div className="space-y-6">
			{/* Toolbar */}
			<div className="flex items-center justify-end gap-2">
				<Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
					<DialogTrigger asChild>
						<Button>
							<PlusIcon className="mr-2 h-4 w-4" />
							Add Transaction
						</Button>
					</DialogTrigger>
					<DialogContent className="max-w-2xl">
						<DialogHeader>
							<DialogTitle>Create New Transaction</DialogTitle>
							<DialogDescription>
								Add a new income or expense transaction
							</DialogDescription>
						</DialogHeader>
						{categories && accounts && (
							<TransactionForm
								categories={categories}
								accounts={accounts}
								bills={bills}
								preSelectedBillId={createFromBill}
								defaultValues={
									selectedBill
										? {
												name: selectedBill.name,
												amount: selectedBill.estimatedAmount,
												date: selectedBill.nextOccurrence
													? new Date(selectedBill.nextOccurrence)
													: new Date(),
												categoryId: selectedBill.categoryId,
												accountId: selectedBill.accountId,
												notes: `Payment to ${selectedBill.recipient}`,
											}
										: undefined
								}
								onSubmit={async (data, billData) => {
									let finalBillId = data.billId;

									if (billData) {
										const newBill = await new Promise<string>(
											(resolve, reject) => {
												createBill(
													{
														...billData,
														name: data.name,
														estimatedAmount: data.amount,
														accountId: data.accountId,
														categoryId: data.categoryId,
														budgetId,
														userId,
														lastPaymentDate:
															billData.lastPaymentDate ?? undefined,
													},
													{
														onSuccess: (bill) => resolve(bill.id),
														onError: reject,
													},
												);
											},
										);
										finalBillId = newBill;
									}

									createTransaction({
										...data,
										billId: finalBillId || undefined,
										budgetId,
										userId,
									});
								}}
								onCancel={() => setCreateDialogOpen(false)}
								submitLabel="Create Transaction"
							/>
						)}
					</DialogContent>
				</Dialog>
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
									? "text-green-600"
									: "text-red-600"
							}`}
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
					variant={filter === "ALL" ? "default" : "outline"}
					onClick={() => setFilter("ALL")}
				>
					All ({transactions?.length ?? 0})
				</Button>
				<Button
					variant={filter === "INCOME" ? "default" : "outline"}
					onClick={() => setFilter("INCOME")}
				>
					Income ({incomeTransactions?.length ?? 0})
				</Button>
				<Button
					variant={filter === "EXPENSE" ? "default" : "outline"}
					onClick={() => setFilter("EXPENSE")}
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
						<Button onClick={() => setCreateDialogOpen(true)}>
							<PlusIcon className="mr-2 h-4 w-4" />
							Create Your First Transaction
						</Button>
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
							{transactions?.map((transaction) => (
								<TableRow key={transaction.id}>
									<TableCell>
										{format(new Date(transaction.date), "PP")}
									</TableCell>
									<TableCell className="font-medium">
										{transaction.name}
									</TableCell>
									<TableCell>
										<Badge
											variant={
												transaction.category.type === "INCOME"
													? "default"
													: "secondary"
											}
										>
											{transaction.category.name}
										</Badge>
									</TableCell>
									<TableCell className="text-muted-foreground">
										{transaction.account.name}
									</TableCell>
									<TableCell
										className={`text-right font-medium ${
											transaction.category.type === "INCOME"
												? "text-green-600"
												: "text-red-600"
										}`}
									>
										{transaction.category.type === "INCOME" ? "+" : "-"}
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
												<DropdownMenuItem
													onClick={() =>
														setEditingTransaction({
															id: transaction.id,
															name: transaction.name,
															amount: transaction.amount,
															date: new Date(transaction.date),
															categoryId: transaction.categoryId,
															accountId: transaction.accountId,
															notes: transaction.notes,
														})
													}
												>
													<PencilIcon className="mr-2 h-4 w-4" />
													Edit
												</DropdownMenuItem>
												<DropdownMenuItem
													onClick={() => {
														if (
															confirm(
																`Clone transaction "${transaction.name}"?`,
															)
														) {
															cloneTransaction({
																id: transaction.id,
																userId,
															});
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
																`Are you sure you want to delete "${transaction.name}"?`,
															)
														) {
															deleteTransaction({
																id: transaction.id,
																userId,
															});
														}
													}}
												>
													<TrashIcon className="mr-2 h-4 w-4" />
													Delete
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</Card>
			)}

			{/* Edit Transaction Dialog */}
			<Dialog
				open={!!editingTransaction}
				onOpenChange={(open) => !open && setEditingTransaction(null)}
			>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Edit Transaction</DialogTitle>
						<DialogDescription>
							Update transaction information
						</DialogDescription>
					</DialogHeader>
					{editingTransaction && categories && accounts && (
						<TransactionForm
							defaultValues={{
								name: editingTransaction.name,
								amount: editingTransaction.amount,
								date: editingTransaction.date,
								categoryId: editingTransaction.categoryId,
								accountId: editingTransaction.accountId,
								notes: editingTransaction.notes ?? "",
							}}
							categories={categories}
							accounts={accounts}
							bills={bills}
							isEditing={true}
							onSubmit={async (data) => {
								updateTransaction({
									id: editingTransaction.id,
									userId,
									...data,
								});
							}}
							onCancel={() => setEditingTransaction(null)}
							submitLabel="Update Transaction"
						/>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
