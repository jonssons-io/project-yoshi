/**
 * Budgets page - List and manage budgets
 */

import { createFileRoute, Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import { PencilIcon, PlusIcon, TrashIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
	const { t } = useTranslation()
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
				<p className="text-muted-foreground">{t('common.loading')}</p>
			</div>
		)
	}

	if (error) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>{t('budgets.error')}</CardTitle>
					<CardDescription>
						{error instanceof Error ? error.message : t('common.error')}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button onClick={() => refetch()}>{t('budgets.tryAgain')}</Button>
				</CardContent>
			</Card>
		)
	}

	const handleCreate = () => {
		openDrawer(
			<div className="p-4">
				<h2 className="text-2xl font-bold mb-4">{t('budgets.create')}</h2>
				<p className="text-muted-foreground mb-6">{t('budgets.createDesc')}</p>
				<BudgetForm
					onSubmit={async (data) => {
						createBudget({
							...data,
							householdId,
							userId
						})
					}}
					onCancel={closeDrawer}
					submitLabel={t('budgets.create')}
				/>
			</div>,
			t('budgets.create')
		)
	}

	const handleEdit = (budget: {
		id: string
		name: string
		startDate: Date
	}) => {
		openDrawer(
			<div className="p-4">
				<h2 className="text-2xl font-bold mb-4">{t('budgets.edit')}</h2>
				<p className="text-muted-foreground mb-6">{t('budgets.editDesc')}</p>
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
					submitLabel={t('common.update')}
				/>
			</div>,
			t('budgets.edit')
		)
	}

	return (
		<div className="space-y-6">
			{/* Toolbar */}
			<div className="flex items-center justify-end">
				<Button onClick={handleCreate}>
					<PlusIcon className="mr-2 h-4 w-4" />
					{t('budgets.create')}
				</Button>
			</div>

			{budgets?.length === 0 ? (
				<Card>
					<CardHeader>
						<CardTitle>{t('budgets.noBudgets')}</CardTitle>
						<CardDescription>{t('budgets.getStarted')}</CardDescription>
					</CardHeader>
					<CardContent>
						<Button onClick={handleCreate}>
							<PlusIcon className="mr-2 h-4 w-4" />
							{t('budgets.createFirst')}
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
									{t('budgets.started')}{' '}
									{format(new Date(budget.startDate), 'PP')}
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-2 text-sm">
									<div className="flex justify-between">
										<span className="text-muted-foreground">
											{t('common.category')}:
										</span>
										<span className="font-medium">
											{budget._count.categories}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">
											{t('common.account')}:
										</span>
										<span className="font-medium">
											{budget._count.accounts}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">
											{t('transactions.title')}:
										</span>
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
										{t('budgets.viewDetails')}
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
											confirm(t('budgets.deleteConfirm', { name: budget.name }))
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
