import { SettingsIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CreateTransactionButton } from '@/components/transactions/CreateTransactionButton'
import { CreateTransferButton } from '@/components/transfers/CreateTransferButton'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'
import { useAccountBalancesList, useMultiAccountBalanceHistory } from '@/hooks/api'
import { useDashboardSettings } from '@/hooks/use-dashboard-settings'
import { useDrawer } from '@/hooks/use-drawer'
import { generateChartDataFromSnapshots, getDateRange } from '@/lib/dashboard-utils'
import { AccountSummaryCard } from './AccountSummaryCard'
import { DashboardChart } from './DashboardChart'
import { DashboardChartSettings } from './DashboardChartSettings'

type DashboardAccount = {
	id: string
	name: string
	initialBalance: number
	externalIdentifier?: string | null
}

type DashboardContentProps = {
	budgetId: string
	accounts: DashboardAccount[]
}

export function DashboardContent({ budgetId, accounts }: DashboardContentProps) {
	const { t } = useTranslation()
	const { userId, householdId } = useAuth()
	const { openDrawer, isOpen } = useDrawer()
	const [isSettingsOpen, setIsSettingsOpen] = useState(false)

	const {
		quickSelection,
		setQuickSelection,
		customStartDate,
		customEndDate,
		setCustomDateRange,
		selectedAccountIds,
		updateSelectedAccounts
	} = useDashboardSettings({
		userId,
		accounts
	})

	const { startDate, endDate } = getDateRange(
		quickSelection,
		customStartDate,
		customEndDate
	)

	const chartAccounts = useMemo(
		() => accounts.filter((account) => selectedAccountIds.includes(account.id)),
		[accounts, selectedAccountIds]
	)

	const accountIds = useMemo(() => accounts.map((account) => account.id), [accounts])
	const chartAccountIds = useMemo(
		() => chartAccounts.map((account) => account.id),
		[chartAccounts]
	)

	const { data: accountBalances } = useAccountBalancesList({
		householdId,
		userId,
		accountIds,
		enabled: accountIds.length > 0
	})

	const { data: multiHistory } = useMultiAccountBalanceHistory({
		accountIds: chartAccountIds,
		userId,
		dateFrom: startDate,
		dateTo: endDate,
		enabled: chartAccountIds.length > 0
	})

	const currentBalances = useMemo(() => {
		const balances = new Map<string, number>()

		for (const account of accounts) {
			balances.set(account.id, Number(account.initialBalance))
		}

		for (const balance of accountBalances ?? []) {
			balances.set(balance.accountId, Number(balance.currentBalance))
		}

		return balances
	}, [accounts, accountBalances])

	const hasStaleHistory = useMemo(
		() => (multiHistory ?? []).some((item) => item.staleHistory),
		[multiHistory]
	)

	const chartData = useMemo(() => {
		return generateChartDataFromSnapshots(
			chartAccounts,
			multiHistory ?? [],
			currentBalances,
			startDate,
			endDate
		)
	}, [chartAccounts, multiHistory, currentBalances, startDate, endDate])

	const renderSettingsContent = () => (
		<DashboardChartSettings
			accounts={accounts}
			selectedAccountIds={selectedAccountIds}
			onToggleAccount={(id, checked) => {
				updateSelectedAccounts(
					checked
						? [...selectedAccountIds, id]
						: selectedAccountIds.filter((accountId) => accountId !== id)
				)
			}}
			onToggleAllAccounts={(checked) => {
				updateSelectedAccounts(checked ? accounts.map((account) => account.id) : [])
			}}
			dateRange={quickSelection}
			onDateRangeChange={setQuickSelection}
			customStartDate={customStartDate}
			customEndDate={customEndDate}
			onCustomDateChange={setCustomDateRange}
		/>
	)

	useEffect(() => {
		if (!isOpen) {
			setIsSettingsOpen(false)
		}
	}, [isOpen])

	// biome-ignore lint/correctness/useExhaustiveDependencies: openDrawer target updates while drawer is open.
	useEffect(() => {
		if (!isOpen || !isSettingsOpen) return
		openDrawer(renderSettingsContent(), t('dashboard.chartSettings'))
	}, [
		isOpen,
		isSettingsOpen,
		openDrawer,
		t,
		accounts,
		selectedAccountIds,
		quickSelection,
		customStartDate,
		customEndDate
	])

	const handleOpenSettings = () => {
		setIsSettingsOpen(true)
		openDrawer(renderSettingsContent(), t('dashboard.chartSettings'))
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-end gap-2">
				<CreateTransactionButton budgetId={budgetId} variant="default" className="h-9" />
				<CreateTransferButton budgetId={budgetId} variant="outline" className="h-9" />
			</div>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<div className="space-y-1.5">
						<CardTitle>{t('dashboard.balanceHistory')}</CardTitle>
						<CardDescription>{t('dashboard.balanceHistoryDesc')}</CardDescription>
						{hasStaleHistory ? (
							<p className="text-xs text-muted-foreground">
								{t('dashboard.staleHistory')}
							</p>
						) : null}
					</div>
					<Button variant="ghost" size="icon" onClick={handleOpenSettings}>
						<SettingsIcon className="h-4 w-4" />
					</Button>
				</CardHeader>
				<CardContent>
					<DashboardChart data={chartData} accounts={chartAccounts} />
				</CardContent>
			</Card>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{accounts.map((account) => (
					<AccountSummaryCard
						key={account.id}
						account={account}
						currentBalance={currentBalances.get(account.id)}
					/>
				))}
			</div>
		</div>
	)
}
