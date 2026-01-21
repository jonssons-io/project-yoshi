/**
 * Dashboard - Main landing page showing account balances and charts
 */

import { createFileRoute, Link } from '@tanstack/react-router'
import { eachDayOfInterval, endOfMonth, format, startOfMonth } from 'date-fns'
import {
	CalendarIcon,
	PlusIcon,
	TrendingDownIcon,
	TrendingUpIcon
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { NoAccount } from '@/components/dashboard/NoAccount'
import { NoBudget } from '@/components/dashboard/NoBudget'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent
} from '@/components/ui/chart'
import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from '@/components/ui/popover'
import { useAuth } from '@/contexts/auth-context'
import {
	useAccountBalance,
	useAccountsList,
	useBudgetsList,
	useTransactionsList
} from '@/hooks/api'
import { formatCurrency } from '@/lib/utils'

export const Route = createFileRoute('/_authenticated/')({
	component: Dashboard
})

function Dashboard() {
	const { userId, householdId } = useAuth()

	// Date range state
	const [quickSelection, setQuickSelection] = useState<
		'current-month' | 'custom'
	>('current-month')
	const [customStartDate, setCustomStartDate] = useState<Date | undefined>(
		undefined
	)
	const [customEndDate, setCustomEndDate] = useState<Date | undefined>(
		undefined
	)

	// Calculate date range based on selection
	const { startDate, endDate } = useMemo(() => {
		if (quickSelection === 'current-month') {
			const now = new Date()
			return {
				startDate: startOfMonth(now),
				endDate: endOfMonth(now)
			}
		}

		// Custom range
		if (customStartDate && customEndDate) {
			return {
				startDate: customStartDate,
				endDate: customEndDate
			}
		}

		// Fallback to current month if custom dates not set
		const now = new Date()
		return {
			startDate: startOfMonth(now),
			endDate: endOfMonth(now)
		}
	}, [quickSelection, customStartDate, customEndDate])

	// Fetch all budgets for the selected household
	const { data: budgets, isLoading: budgetsLoading } = useBudgetsList({
		householdId,
		userId
	})

	// Use the first budget for now (later can add budget selector)
	const activeBudget = budgets?.[0]

	// Fetch accounts for the selected household
	const {
		data: accounts,
		isLoading: accountsLoading,
		refetch: refetchAccounts
	} = useAccountsList({
		householdId,
		userId
	})

	// Fetch transactions for the date range
	const { data: transactions } = useTransactionsList({
		budgetId: activeBudget?.id ?? '',
		userId,
		dateFrom: startDate,
		dateTo: endDate,
		enabled: !!activeBudget
	})

	if (budgetsLoading || accountsLoading) {
		return (
			<div className="flex items-center justify-center">
				<p className="text-muted-foreground">Loading dashboard...</p>
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
			{/* Toolbar with date range info and selectors */}
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					{activeBudget.name} –{' '}
					{quickSelection === 'current-month'
						? format(startDate, 'MMMM yyyy')
						: `${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`}
				</p>
				<div className="flex gap-2">
					<Button
						variant={quickSelection === 'current-month' ? 'default' : 'outline'}
						onClick={() => setQuickSelection('current-month')}
						size="sm"
					>
						Current Month
					</Button>

					<Popover>
						<PopoverTrigger asChild>
							<Button
								variant={quickSelection === 'custom' ? 'default' : 'outline'}
								size="sm"
							>
								<CalendarIcon className="mr-2 h-4 w-4" />
								Custom Range
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-auto p-0" align="end">
							<div className="p-4 space-y-4">
								<div>
									<p className="mb-2 text-sm font-medium">Start Date</p>
									<Calendar
										mode="single"
										selected={customStartDate}
										onSelect={(date) => {
											setCustomStartDate(date)
											if (date) {
												setQuickSelection('custom')
											}
										}}
										initialFocus
									/>
								</div>
								<div>
									<p className="mb-2 text-sm font-medium">End Date</p>
									<Calendar
										mode="single"
										selected={customEndDate}
										onSelect={(date) => {
											setCustomEndDate(date)
											if (date && customStartDate) {
												setQuickSelection('custom')
											}
										}}
										disabled={(date) =>
											customStartDate ? date < customStartDate : false
										}
									/>
								</div>
							</div>
						</PopoverContent>
					</Popover>
				</div>
			</div>

			{/* Account Cards with Charts */}
			<div className="space-y-6">
				{accounts.map((account) => (
					<AccountCard
						key={account.id}
						account={account}
						userId={userId}
						transactions={transactions?.filter(
							(t) => t.accountId === account.id
						)}
						startDate={startDate}
						endDate={endDate}
					/>
				))}
			</div>

			{/* Quick Actions */}
			<Card>
				<CardHeader>
					<CardTitle>Quick Actions</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex flex-wrap gap-2">
						<Button asChild>
							<Link to="/transactions" search={{ budgetId: activeBudget.id }}>
								<PlusIcon className="mr-2 h-4 w-4" />
								Add Transaction
							</Link>
						</Button>
						<Button asChild variant="outline">
							<Link to="/accounts" search={{ budgetId: activeBudget.id }}>
								View All Accounts
							</Link>
						</Button>
						<Button asChild variant="outline">
							<Link to="/categories" search={{ budgetId: activeBudget.id }}>
								Manage Categories
							</Link>
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

// Account card component with balance chart
function AccountCard({
	account,
	userId,
	transactions,
	startDate,
	endDate
}: {
	account: {
		id: string
		name: string
		initialBalance: number
		externalIdentifier: string | null
	}
	userId: string
	transactions?: Array<{
		id: string
		amount: number
		date: Date | string
		category: { type: string }
	}>
	startDate: Date
	endDate: Date
}) {
	// Fetch current balance
	const { data: balanceData } = useAccountBalance({
		accountId: account.id,
		userId,
		enabled: true
	})

	// Calculate balance over time for the chart
	const chartData = useMemo(() => {
		if (!transactions) return []

		const days = eachDayOfInterval({ start: startDate, end: endDate })
		let runningBalance = account.initialBalance

		return days.map((day) => {
			// Get transactions for this day
			const dayTransactions = transactions.filter((t) => {
				const transactionDate = new Date(t.date)
				return (
					transactionDate.getFullYear() === day.getFullYear() &&
					transactionDate.getMonth() === day.getMonth() &&
					transactionDate.getDate() === day.getDate()
				)
			})

			// Calculate balance change for this day
			const dayChange = dayTransactions.reduce((sum, t) => {
				return sum + (t.category.type === 'INCOME' ? t.amount : -t.amount)
			}, 0)

			runningBalance += dayChange

			return {
				date: format(day, 'MMM dd'),
				balance: runningBalance
			}
		})
	}, [transactions, startDate, endDate, account.initialBalance])

	const currentBalance = balanceData?.currentBalance ?? account.initialBalance
	const balanceChange =
		transactions?.reduce((sum, t) => {
			return sum + (t.category.type === 'INCOME' ? t.amount : -t.amount)
		}, 0) ?? 0

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>{account.name}</CardTitle>
						{account.externalIdentifier && (
							<CardDescription>{account.externalIdentifier}</CardDescription>
						)}
					</div>
					<div className="text-right">
						<div className="text-3xl font-bold">
							{formatCurrency(currentBalance)}
						</div>
						{balanceChange !== 0 && (
							<div
								className={`flex items-center justify-end gap-1 text-sm ${
									balanceChange >= 0 ? 'text-green-600' : 'text-red-600'
								}`}
							>
								{balanceChange >= 0 ? (
									<TrendingUpIcon className="h-4 w-4" />
								) : (
									<TrendingDownIcon className="h-4 w-4" />
								)}
								<span>
									{balanceChange >= 0 ? '+' : ''}
									{formatCurrency(balanceChange)} this month
								</span>
							</div>
						)}
					</div>
				</div>
			</CardHeader>
			<CardContent>
				{chartData.length > 0 ? (
					<ChartContainer
						config={{
							balance: {
								label: 'Balance',
								color: 'hsl(var(--chart-1))'
							}
						}}
						className="h-50"
					>
						<AreaChart data={chartData}>
							<defs>
								<linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
									<stop
										offset="5%"
										stopColor="hsl(var(--chart-1))"
										stopOpacity={0.3}
									/>
									<stop
										offset="95%"
										stopColor="hsl(var(--chart-1))"
										stopOpacity={0}
									/>
								</linearGradient>
							</defs>
							<CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
							<XAxis
								dataKey="date"
								tick={{ fontSize: 12 }}
								tickLine={false}
								axisLine={false}
							/>
							<YAxis
								tick={{ fontSize: 12 }}
								tickLine={false}
								axisLine={false}
								tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
							/>
							<ChartTooltip
								content={
									<ChartTooltipContent
										formatter={(value) => formatCurrency(Number(value))}
									/>
								}
							/>
							<Area
								type="monotone"
								dataKey="balance"
								stroke="hsl(var(--chart-1))"
								strokeWidth={2}
								fill="url(#colorBalance)"
							/>
						</AreaChart>
					</ChartContainer>
				) : (
					<div className="flex h-50 items-center justify-center text-muted-foreground">
						No transactions this month
					</div>
				)}
			</CardContent>
		</Card>
	)
}
