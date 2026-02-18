/**
 * Budget detail page - View and manage a specific budget
 */

import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'
import { useBudgetById } from '@/hooks/api'

export const Route = createFileRoute('/_authenticated/budgets/$budgetId')({
	component: BudgetDetailPage
})

function BudgetDetailPage() {
	const { t } = useTranslation()
	const { budgetId } = Route.useParams()
	const { userId } = useAuth()

	const { data: budget, isLoading } = useBudgetById({
		budgetId,
		userId,
		enabled: true
	})

	if (isLoading) {
		return (
			<div className="flex items-center justify-center">
				<p className="text-muted-foreground">{t('common.loading')}</p>
			</div>
		)
	}

	if (!budget) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>{t('budgets.notFound')}</CardTitle>
					<CardDescription>{t('budgets.notFoundDesc')}</CardDescription>
				</CardHeader>
				<CardContent>
					<Button asChild>
						<Link to="/budgets">{t('budgets.backToBudgets')}</Link>
					</Button>
				</CardContent>
			</Card>
		)
	}

	return (
		<div className="space-y-6">
			<div className="grid gap-6 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>{t('transactions.title')}</CardTitle>
						<CardDescription>
							{t('transactions.createTransactionDesc')}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<div className="text-4xl font-bold">
								{budget._count.transactions}
							</div>
							<Button asChild className="w-full">
								<Link to="/transactions" search={{ budgetId }}>
									{t('budgets.viewTransactions')}
								</Link>
							</Button>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>{t('bills.title')}</CardTitle>
						<CardDescription>{t('bills.createBillDesc')}</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<div className="text-4xl font-bold">
								{budget._count.bills || 0}
							</div>
							<Button asChild className="w-full">
								<Link to="/bills" search={{ budgetId }}>
									{t('budgets.manageBills')}
								</Link>
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>{t('budgets.quickActions')}</CardTitle>
					<CardDescription>{t('budgets.manageData')}</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-wrap gap-2">
						<Button asChild>
							<Link to="/transactions" search={{ budgetId }}>
								{t('transactions.addTransaction')}
							</Link>
						</Button>
						<Button asChild variant="outline">
							<Link to="/bills" search={{ budgetId }}>
								{t('bills.newBill')}
							</Link>
						</Button>
						<Button asChild variant="outline">
							<Link to="/categories">{t('budgets.manageCategories')}</Link>
						</Button>
						<Button asChild variant="outline">
							<Link to="/accounts">{t('budgets.manageAccounts')}</Link>
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
