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
import { useAuth } from '@/contexts/auth-context'
import { BudgetForm } from '@/forms/BudgetForm'
import {
	useBudgetsList,
	useCreateBudget,
	useDeleteBudget,
	useUpdateBudget
} from '@/hooks/api'
import { useDrawer } from '@/hooks/use-drawer'

export const Route = createFileRoute('/_authenticated/budgets/')({
	component: BudgetsPage
})

function BudgetsPage() {
	const { userId, householdId } = useAuth()
	const { openDrawer, closeDrawer } = useDrawer()

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
			closeDrawer()
		}
	})

	const { mutate: updateBudget } = useUpdateBudget({
		onSuccess: () => {
			refetch()
			closeDrawer()
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

	const handleCreate = () => {
		openDrawer(
			<div className="p-4">
				<h2 className="text-2xl font-bold mb-4">Create New Budget</h2>
				<p className="text-muted-foreground mb-6">
					Create a new budget to track your income and expenses
				</p>
				<BudgetForm
					onSubmit={async (data) => {
						createBudget({
							...data,
							householdId,
							userId
						})
					}}
					onCancel={closeDrawer}
					submitLabel="Create Budget"
				/>
			</div>,
			'Create Budget'
		)
	}

	const handleEdit = (budget: {
		id: string
		name: string
		startDate: Date
	}) => {
		openDrawer(
			<div className="p-4">
				<h2 className="text-2xl font-bold mb-4">Edit Budget</h2>
				<p className="text-muted-foreground mb-6">
					Update your budget information
				</p>
				<BudgetForm
					defaultValues={{
						name: budget.name,
						startDate: budget.startDate
					}}
					onSubmit={async (data) => {
						updateBudget({
							id: budget.id,
							userId,
							...data
						})
					}}
					onCancel={closeDrawer}
					submitLabel="Update Budget"
				/>
			</div>,
			'Edit Budget'
		)
	}

	return (
		<div className="space-y-6">
			{/* Toolbar */}
			<div className="flex items-center justify-end">
				<Button onClick={handleCreate}>
					<PlusIcon className="mr-2 h-4 w-4" />
					Create Budget
				</Button>
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
						<Button onClick={handleCreate}>
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
										handleEdit({
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
		</div>
	)
}
