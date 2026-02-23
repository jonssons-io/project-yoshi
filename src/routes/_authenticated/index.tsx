import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { DashboardContent } from '@/components/dashboard/DashboardContent'
import { SetupPrompt } from '@/components/dashboard/SetupPrompt'
import { useAuth } from '@/contexts/auth-context'
import { useAccountsList, useBudgetsList } from '@/hooks/api'
import { useSelectedBudget } from '@/hooks/use-selected-budget'

export const Route = createFileRoute('/_authenticated/')({
	component: Dashboard
})

function Dashboard() {
	const { t } = useTranslation()
	const { userId, householdId } = useAuth()

	const { data: budgets, isLoading: budgetsLoading } = useBudgetsList({
		householdId,
		userId
	})

	const { selectedBudgetId, isLoading: selectedBudgetLoading } = useSelectedBudget(
		userId,
		householdId
	)
	const activeBudget =
		budgets?.find((b) => b.id === selectedBudgetId) ?? budgets?.[0]
	const shouldFetchAccounts = !!activeBudget?.id

	const { data: accounts, isLoading: accountsLoading } = useAccountsList({
		householdId,
		userId,
		budgetId: activeBudget?.id,
		enabled: shouldFetchAccounts
	})

	if (
		budgetsLoading ||
		selectedBudgetLoading ||
		(shouldFetchAccounts && accountsLoading)
	) {
		return (
			<div className="flex items-center justify-center">
				<p className="text-muted-foreground">{t('common.loading')}</p>
			</div>
		)
	}

	if (!activeBudget) {
		return <SetupPrompt variant="no-budget" />
	}

	if (!accounts || accounts.length === 0) {
		return <SetupPrompt variant="no-account" />
	}

	return <DashboardContent budgetId={activeBudget.id} accounts={accounts} />
}
