/**
 * Dashboard - Main landing page showing account balances and charts
 */

import { createFileRoute, Link } from '@tanstack/react-router'
import { useUser } from '@clerk/clerk-react'
import { useTRPC } from '@/integrations/trpc/react'
import { useQuery } from '@tanstack/react-query'
import { useSelectedHousehold } from '@/hooks/use-selected-household'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { useState, useMemo } from 'react'
import { PlusIcon, TrendingUpIcon, TrendingDownIcon, CalendarIcon } from 'lucide-react'
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from 'date-fns'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

// TODO: Remove this once Clerk is properly configured
const MOCK_USER_ID = 'demo-user-123'

function Dashboard() {
  const { user } = useUser()
  const userId = user?.id ?? MOCK_USER_ID
  const trpc = useTRPC()
  const { selectedHouseholdId } = useSelectedHousehold()

  // Date range state
  const [quickSelection, setQuickSelection] = useState<'current-month' | 'custom'>(
    'current-month',
  )
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined)
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined)

  // Calculate date range based on selection
  const { startDate, endDate } = useMemo(() => {
    if (quickSelection === 'current-month') {
      const now = new Date()
      return {
        startDate: startOfMonth(now),
        endDate: endOfMonth(now),
      }
    }

    // Custom range
    if (customStartDate && customEndDate) {
      return {
        startDate: customStartDate,
        endDate: customEndDate,
      }
    }

    // Fallback to current month if custom dates not set
    const now = new Date()
    return {
      startDate: startOfMonth(now),
      endDate: endOfMonth(now),
    }
  }, [quickSelection, customStartDate, customEndDate])

  // Fetch all budgets for the selected household
  const { data: budgets, isLoading: budgetsLoading } = useQuery({
    ...trpc.budgets.list.queryOptions({
      householdId: selectedHouseholdId!,
      userId,
    }),
    enabled: !!selectedHouseholdId,
  })

  // Use the first budget for now (later can add budget selector)
  const activeBudget = budgets?.[0]

  // Fetch accounts for the selected household
  const { data: accounts, isLoading: accountsLoading } = useQuery({
    ...trpc.accounts.list.queryOptions({
      householdId: selectedHouseholdId!,
      userId,
    }),
    enabled: !!selectedHouseholdId,
  })

  // Fetch transactions for the date range
  const { data: transactions } = useQuery({
    ...trpc.transactions.list.queryOptions({
      budgetId: activeBudget?.id ?? '',
      userId,
      dateFrom: startDate,
      dateTo: endDate,
    }),
    enabled: !!activeBudget,
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  if (budgetsLoading || accountsLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center">
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!activeBudget) {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle>Welcome to Your Budget App!</CardTitle>
            <CardDescription>
              Get started by creating your first budget
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/budgets">
                <PlusIcon className="mr-2 h-4 w-4" />
                Create Your First Budget
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!accounts || accounts.length === 0) {
    return (
      <div className="container py-8">
        <h1 className="mb-6 text-3xl font-bold">Dashboard</h1>
        <Card>
          <CardHeader>
            <CardTitle>No Accounts Yet</CardTitle>
            <CardDescription>
              Create accounts to start tracking your finances
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/accounts" search={{ budgetId: activeBudget.id }}>
                <PlusIcon className="mr-2 h-4 w-4" />
                Create Your First Account
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            {activeBudget.name} -{' '}
            {quickSelection === 'current-month'
              ? format(startDate, 'MMMM yyyy')
              : `${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={quickSelection === 'current-month' ? 'default' : 'outline'}
            onClick={() => setQuickSelection('current-month')}
          >
            Current Month
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={quickSelection === 'custom' ? 'default' : 'outline'}
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
              (t) => t.accountId === account.id,
            )}
            startDate={startDate}
            endDate={endDate}
            formatCurrency={formatCurrency}
          />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
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
    </div>
  )
}

// Account card component with balance chart
function AccountCard({
  account,
  userId,
  transactions,
  startDate,
  endDate,
  formatCurrency,
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
  formatCurrency: (amount: number) => string
}) {
  const trpc = useTRPC()

  // Fetch current balance
  const { data: balanceData } = useQuery({
    ...trpc.accounts.getBalance.queryOptions({
      id: account.id,
      userId,
    }),
    enabled: true,
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
        balance: runningBalance,
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
                color: 'hsl(var(--chart-1))',
              },
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
