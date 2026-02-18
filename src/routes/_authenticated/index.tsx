// Dashboard - Main landing page showing account balances and charts
import { createFileRoute } from '@tanstack/react-router'
import { SettingsIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DashboardChart } from '@/components/dashboard/DashboardChart'
import { DashboardChartSettings } from '@/components/dashboard/DashboardChartSettings'
import { NoAccount } from '@/components/dashboard/NoAccount'
import { NoBudget } from '@/components/dashboard/NoBudget'
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
import {
	useAccountBalance,
	useAccountsList,
	useBudgetsList,
	useTransactionsList
} from '@/hooks/api'
import { useDrawer } from '@/hooks/use-drawer'
import { useSelectedBudget } from '@/hooks/use-selected-budget'
import {
	type DateRangeOption,
	generateChartData,
	getDateRange
} from '@/lib/dashboard-utils'
import { formatCurrency } from '@/lib/utils'

export const Route = createFileRoute('/_authenticated/')({
	component: Dashboard
})

function Dashboard() {
	const { t } = useTranslation()
	const { userId, householdId } = useAuth()

	// --- Local Storage Keys ---
	const STORAGE_PREFIX = 'yoshi-dashboard-settings'
	const ACCOUNT_SELECTION_KEY = userId
		? `${STORAGE_PREFIX}-accounts-${userId}`
		: null
	const DATE_RANGE_KEY = userId
		? `${STORAGE_PREFIX}-date-range-${userId}`
		: null

	// --- State Management ---
	// Date range with filtered local storage persistence
	const [quickSelection, setQuickSelectionState] =
		useState<DateRangeOption>('current-month')

	// Initialize date range from local storage
	useEffect(() => {
		if (!DATE_RANGE_KEY) return
		const stored = localStorage.getItem(DATE_RANGE_KEY)
		if (stored) {
			// Validate stored value is a valid option (custom logic handled separately if needed)
			if (['current-month', '3-months', 'custom'].includes(stored)) {
				setQuickSelectionState(stored as DateRangeOption)
			}
		}
	}, [DATE_RANGE_KEY])

	// Wrapper to save to local storage
	const setQuickSelection = (val: DateRangeOption) => {
		setQuickSelectionState(val)
		if (DATE_RANGE_KEY) {
			localStorage.setItem(DATE_RANGE_KEY, val)
		}
	}

	const [customStartDate, setCustomStartDate] = useState<Date | undefined>(
		undefined
	)
	const [customEndDate, setCustomEndDate] = useState<Date | undefined>(
		undefined
	)

	// Calculate date range based on selection
	const { startDate, endDate } = getDateRange(
		quickSelection,
		customStartDate,
		customEndDate
	)

	// Fetch all budgets for the selected household
	const { data: budgets, isLoading: budgetsLoading } = useBudgetsList({
		householdId,
		userId
	})

	// Use the selected budget from context/storage
	const { selectedBudgetId } = useSelectedBudget(userId, householdId)
	const activeBudget =
		budgets?.find((b) => b.id === selectedBudgetId) ?? budgets?.[0]

	// Fetch accounts for the selected household
	const {
		data: accounts,
		isLoading: accountsLoading,
		refetch: refetchAccounts
	} = useAccountsList({
		householdId,
		userId
	})

	const { openDrawer, isOpen } = useDrawer()

	// Selected accounts state
	const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
	const [isAccountSelectionInitialized, setIsAccountSelectionInitialized] =
		useState(false)

	// Initialize selected accounts from local storage OR default to all
	useEffect(() => {
		if (accounts && !isAccountSelectionInitialized) {
			if (ACCOUNT_SELECTION_KEY) {
				const stored = localStorage.getItem(ACCOUNT_SELECTION_KEY)
				if (stored) {
					try {
						const parsed = JSON.parse(stored)
						if (Array.isArray(parsed)) {
							// Filter specifically for accounts that still exist to avoid zombies
							const validIds = parsed.filter((id) =>
								accounts.some((a) => a.id === id)
							)
							setSelectedAccountIds(
								validIds.length > 0 ? validIds : accounts.map((a) => a.id)
							)
							setIsAccountSelectionInitialized(true)
							return
						}
					} catch {
						// ignore
					}
				}
			}
			// Default to all
			setSelectedAccountIds(accounts.map((a) => a.id))
			setIsAccountSelectionInitialized(true)
		}
	}, [accounts, isAccountSelectionInitialized, ACCOUNT_SELECTION_KEY])

	// Helper to update account selection and persist
	const updateSelectedAccounts = (newIds: string[]) => {
		setSelectedAccountIds(newIds)
		if (ACCOUNT_SELECTION_KEY) {
			localStorage.setItem(ACCOUNT_SELECTION_KEY, JSON.stringify(newIds))
		}
	}

	// Fetch ALL transactions for the budget to ensure accurate historical balances
	const { data: transactions } = useTransactionsList({
		budgetId: activeBudget?.id ?? '',
		userId,
		// No date filters -> fetch all history
		enabled: !!activeBudget
	})

	// Filter accounts for chart
	const chartAccounts = accounts
		? accounts.filter((a) => selectedAccountIds.includes(a.id))
		: []

	// Generate chart data
	const chartData =
		!accounts || !transactions
			? []
			: generateChartData(chartAccounts, transactions, startDate, endDate)

	// Sync settings drawer when state changes if it's open
	// This allows real-time updates of the checkboxes and sliders inside the drawer
	// because the drawer content is otherwise static once opened.

	// We track if the settings drawer was specifically opened by us,
	// to avoid clobbering other drawers if they happen to be open.
	// In a complex app we'd need a "drawerId" or key.
	// For now, we assume if it's open and we have tracking state, it's ours.
	const [isSettingsOpen, setIsSettingsOpen] = useState(false)

	// Reset tracking if drawer is closed externally
	useEffect(() => {
		if (!isOpen) {
			setIsSettingsOpen(false)
		}
	}, [isOpen])

	// Auto-update drawer content if it's open and showing settings
	// biome-ignore lint/correctness/useExhaustiveDependencies: functions are stable via React Compiler
	useEffect(() => {
		if (isOpen && isSettingsOpen) {
			openDrawer(
				<DashboardChartSettings
					accounts={accounts ?? []}
					selectedAccountIds={selectedAccountIds}
					onToggleAccount={(id, checked) => {
						updateSelectedAccounts(
							checked
								? [...selectedAccountIds, id]
								: selectedAccountIds.filter((aid) => aid !== id)
						)
					}}
					onToggleAllAccounts={(checked) => {
						updateSelectedAccounts(
							checked ? (accounts?.map((a) => a.id) ?? []) : []
						)
					}}
					dateRange={quickSelection}
					onDateRangeChange={(range) => {
						setQuickSelection(range)
					}}
					customStartDate={customStartDate}
					customEndDate={customEndDate}
					onCustomDateChange={(start, end) => {
						setCustomStartDate(start)
						setCustomEndDate(end)
						if (start || end) {
							setQuickSelection('custom')
						}
					}}
				/>,
				t('dashboard.chartSettings')
			)
		}
	}, [
		isOpen,
		isSettingsOpen,
		openDrawer,
		accounts,
		selectedAccountIds,
		quickSelection,
		customStartDate,
		customEndDate
	])

	const handleOpenSettingsWithTracking = () => {
		if (!accounts) return
		setIsSettingsOpen(true)
		openDrawer(
			<DashboardChartSettings
				accounts={accounts ?? []}
				selectedAccountIds={selectedAccountIds}
				onToggleAccount={(id, checked) => {
					updateSelectedAccounts(
						checked
							? [...selectedAccountIds, id]
							: selectedAccountIds.filter((aid) => aid !== id)
					)
				}}
				onToggleAllAccounts={(checked) => {
					updateSelectedAccounts(
						checked ? (accounts?.map((a) => a.id) ?? []) : []
					)
				}}
				dateRange={quickSelection}
				onDateRangeChange={(range) => {
					setQuickSelection(range)
				}}
				customStartDate={customStartDate}
				customEndDate={customEndDate}
				onCustomDateChange={(start, end) => {
					setCustomStartDate(start)
					setCustomEndDate(end)
					if (start || end) {
						setQuickSelection('custom')
					}
				}}
			/>,
			t('dashboard.chartSettings')
		)
	}

	if (budgetsLoading || accountsLoading) {
		return (
			<div className="flex items-center justify-center">
				<p className="text-muted-foreground">{t('common.loading')}</p>
			</div>
		)
	}

	if (!activeBudget) {
		return <NoBudget userId={userId} householdId={householdId} />
	}

	if (!accounts || accounts.length === 0) {
		return (
			<NoAccount
				userId={userId}
				householdId={householdId}
				onAccountCreated={refetchAccounts}
			/>
		)
	}

	return (
		<div className="space-y-6">
			{/* Toolbar with date range info, selectors and quick actions */}
			<div className="flex items-center gap-2 justify-end">
				<CreateTransactionButton
					budgetId={activeBudget.id}
					variant="default"
					className="h-9"
				/>
				<CreateTransferButton
					budgetId={activeBudget.id}
					variant="outline"
					className="h-9"
				/>
			</div>

			{/* Main Chart */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<div className="space-y-1.5">
						<CardTitle>{t('dashboard.balanceHistory')}</CardTitle>
						<CardDescription>
							{t('dashboard.balanceHistoryDesc')}
						</CardDescription>
					</div>
					<Button
						variant="ghost"
						size="icon"
						onClick={handleOpenSettingsWithTracking}
					>
						<SettingsIcon className="h-4 w-4" />
					</Button>
				</CardHeader>
				<CardContent>
					<DashboardChart data={chartData} accounts={chartAccounts} />
				</CardContent>
			</Card>

			{/* Account Summaries Grid */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{accounts.map((account) => (
					<AccountSummaryCard
						key={account.id}
						account={account}
						userId={userId}
					/>
				))}
			</div>
		</div>
	)
}

// Simple Account summary card
function AccountSummaryCard({
	account,
	userId
}: {
	account: {
		id: string
		name: string
		initialBalance: number
		externalIdentifier: string | null
	}
	userId: string
}) {
	const { data: balanceData } = useAccountBalance({
		accountId: account.id,
		userId,
		enabled: true
	})

	const currentBalance = balanceData?.currentBalance ?? account.initialBalance

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium">{account.name}</CardTitle>
				{account.externalIdentifier && (
					<span className="text-xs text-muted-foreground truncate max-w-[100px]">
						{account.externalIdentifier}
					</span>
				)}
			</CardHeader>
			<CardContent>
				<div className="text-2xl font-bold">
					{formatCurrency(currentBalance)}
				</div>
			</CardContent>
		</Card>
	)
}
