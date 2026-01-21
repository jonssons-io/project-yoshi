/**
 * Budgets page - List and manage budgets
 */

import { createFileRoute, Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import { PencilIcon, PlusIcon, TrashIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog'
import { useAuth } from '@/contexts/auth-context'
import { BudgetForm } from '@/forms/BudgetForm'
import {
	useBudgetsList,
	useCreateBudget,
	useDeleteBudget,
	useUpdateBudget
} from '@/hooks/api'

export const Route = createFileRoute('/_authenticated/budgets/')({
	component: BudgetsPage
})

function BudgetsPage() {
	const { userId, householdId } = useAuth()
	const [createDialogOpen, setCreateDialogOpen] = useState(false)
	const [editingBudget, setEditingBudget] = useState<{
		id: string
		name: string
		startDate: Date
	} | null>(null)

	const {
		data: budgets,
		isLoading,
		refetch,
		error
	} = useBudgetsList({
		householdId,
		userId
	})

	const { mutate: createBudget } = useCreateBudget({
		onSuccess: () => {
			refetch()
			setCreateDialogOpen(false)
		}
	})

	const { mutate: updateBudget } = useUpdateBudget({
		onSuccess: () => {
			refetch()
			setEditingBudget(null)
		}
	})

	const { mutate: deleteBudget } = useDeleteBudget({
		onSuccess: () => {
			refetch()
		}
	})

	if (isLoading) {
		return (
			<div className="flex items-center justify-center">
				<p className="text-muted-foreground">Loading budgets...</p>
			</div>
		)
	}

	if (error) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Error Loading Budgets</CardTitle>
					<CardDescription>
						{error instanceof Error ? error.message : 'An error occurred'}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button onClick={() => refetch()}>Try Again</Button>
				</CardContent>
			</Card>
		)
	}

	return (
		<div className="space-y-6">
			{/* Toolbar */}
			<div className="flex items-center justify-end">
				<Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
					<DialogTrigger asChild>
						<Button>
							<PlusIcon className="mr-2 h-4 w-4" />
							Create Budget
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Create New Budget</DialogTitle>
							<DialogDescription>
								Create a new budget to track your income and expenses
							</DialogDescription>
						</DialogHeader>
						<BudgetForm
							onSubmit={async (data) => {
								createBudget({
									...data,
									householdId,
									userId
								})
							}}
							onCancel={() => setCreateDialogOpen(false)}
							submitLabel="Create Budget"
						/>
					</DialogContent>
				</Dialog>
			</div>

			{budgets?.length === 0 ? (
				<Card>
					<CardHeader>
						<CardTitle>No budgets yet</CardTitle>
						<CardDescription>
							Get started by creating your first budget
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button onClick={() => setCreateDialogOpen(true)}>
							<PlusIcon className="mr-2 h-4 w-4" />
							Create Your First Budget
						</Button>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{budgets?.map((budget) => (
						<Card key={budget.id}>
							<CardHeader>
								<CardTitle>{budget.name}</CardTitle>
								<CardDescription>
									Started {format(new Date(budget.startDate), 'PP')}
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-2 text-sm">
									<div className="flex justify-between">
										<span className="text-muted-foreground">Categories:</span>
										<span className="font-medium">
											{budget._count.categories}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">Accounts:</span>
										<span className="font-medium">
											{budget._count.accounts}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">Transactions:</span>
										<span className="font-medium">
											{budget._count.transactions}
										</span>
									</div>
								</div>
							</CardContent>
							<CardFooter className="flex gap-2">
								<Button asChild variant="outline" className="flex-1">
									<Link
										to="/budgets/$budgetId"
										params={{ budgetId: budget.id }}
									>
										View Details
									</Link>
								</Button>
								<Button
									variant="outline"
									size="icon"
									onClick={() =>
										setEditingBudget({
											id: budget.id,
											name: budget.name,
											startDate: new Date(budget.startDate)
										})
									}
								>
									<PencilIcon className="h-4 w-4" />
								</Button>
								<Button
									variant="outline"
									size="icon"
									onClick={() => {
										if (
											confirm(
												`Are you sure you want to delete ${budget.name}? This will delete all associated categories, accounts, and transactions.`
											)
										) {
											deleteBudget({
												id: budget.id,
												userId
											})
										}
									}}
								>
									<TrashIcon className="h-4 w-4" />
								</Button>
							</CardFooter>
						</Card>
					))}
				</div>
			)}

			{/* Edit Budget Dialog */}
			<Dialog
				open={!!editingBudget}
				onOpenChange={(open) => !open && setEditingBudget(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Budget</DialogTitle>
						<DialogDescription>
							Update your budget information
						</DialogDescription>
					</DialogHeader>
					{editingBudget && (
						<BudgetForm
							defaultValues={{
								name: editingBudget.name,
								startDate: editingBudget.startDate
							}}
							onSubmit={async (data) => {
								updateBudget({
									id: editingBudget.id,
									userId,
									...data
								})
							}}
							onCancel={() => setEditingBudget(null)}
							submitLabel="Update Budget"
						/>
					)}
				</DialogContent>
			</Dialog>
		</div>
	)
}
