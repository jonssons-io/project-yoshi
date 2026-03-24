import {
  EllipsisVerticalIcon,
  Plus,
  Scale,
  SettingsIcon,
  TrendingDown,
  TrendingUp
} from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { TransactionType } from '@/api/generated/types.gen'
import { DashboardMultiSeriesLineChart } from '@/charts/dashboard-multi-series-line-chart/dashboard-multi-series-line-chart'
import { Button } from '@/components/button/button'
import { IconButton } from '@/components/icon-button/icon-button'
import { PageLayout } from '@/components/page-layout/page-layout'
import { Progress } from '@/components/progress/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/table/table'
import { useAuth } from '@/contexts/auth-context'
import { useMultiAccountBalanceHistory, useTransactionsList } from '@/hooks/api'
import {
  generateChartDataFromSnapshots,
  getDateRange
} from '@/lib/dashboard-utils'
import { formatCurrency } from '@/lib/utils'
import type { UseDashboardSettingsResult } from './use-dashboard-settings'

type DashboardAccount = {
  id: string
  name: string
  initialBalance: number
  currentBalance: number
  externalIdentifier?: string | null
}

type DashboardBudget = {
  id: string
  name: string
  allocatedAmount?: number
  spentAmount?: number
  remainingAmount?: number
  isOverdrafted: boolean
  overdraftAmount: number
}

type DashboardContentProps = {
  accounts: DashboardAccount[]
  budgets: DashboardBudget[]
  dashboardSettings: UseDashboardSettingsResult
  onOpenChartSettings: () => void
  unallocatedAmount: number
}

function budgetProgressTone(
  budget: DashboardBudget
): 'danger' | 'warning' | 'success' {
  const allocated = budget.allocatedAmount ?? 0
  const spent = budget.spentAmount ?? 0
  const remaining = budget.remainingAmount ?? 0
  if (budget.isOverdrafted || remaining < 0) return 'danger'
  if (allocated > 0 && spent / allocated >= 0.8) return 'warning'
  return 'success'
}

function budgetProgressClass(tone: 'danger' | 'warning' | 'success'): string {
  if (tone === 'danger') return '[&_[data-slot=progress-indicator]]:bg-red-500'
  if (tone === 'warning')
    return '[&_[data-slot=progress-indicator]]:bg-amber-500'
  return '[&_[data-slot=progress-indicator]]:bg-green-500'
}

export function DashboardContent({
  accounts,
  budgets,
  dashboardSettings,
  onOpenChartSettings,
  unallocatedAmount
}: DashboardContentProps) {
  const { t } = useTranslation()
  const { userId, householdId } = useAuth()

  const { quickSelection, customStartDate, customEndDate, selectedAccountIds } =
    dashboardSettings

  const { startDate, endDate } = getDateRange(
    quickSelection,
    customStartDate,
    customEndDate
  )

  const { data: periodTransactions } = useTransactionsList({
    householdId,
    userId,
    dateFrom: startDate,
    dateTo: endDate,
    enabled: Boolean(householdId)
  })

  const { totalIncome, totalExpense } = useMemo(() => {
    let income = 0
    let expense = 0
    for (const tx of periodTransactions ?? []) {
      if (tx.type === TransactionType.TRANSFER) continue
      if (tx.type === TransactionType.INCOME) income += tx.amount
      else if (tx.type === TransactionType.EXPENSE) expense += tx.amount
    }
    return {
      totalIncome: income,
      totalExpense: expense
    }
  }, [
    periodTransactions
  ])

  const netPeriod = totalIncome - totalExpense

  const chartAccounts = useMemo(
    () => accounts.filter((account) => selectedAccountIds.includes(account.id)),
    [
      accounts,
      selectedAccountIds
    ]
  )

  const chartAccountIds = useMemo(
    () => chartAccounts.map((account) => account.id),
    [
      chartAccounts
    ]
  )

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
      balances.set(
        account.id,
        Number(account.currentBalance ?? account.initialBalance)
      )
    }

    return balances
  }, [
    accounts
  ])

  const totalAvailableFunds = useMemo(
    () =>
      accounts.reduce(
        (sum, account) => sum + (currentBalances.get(account.id) ?? 0),
        0
      ),
    [
      accounts,
      currentBalances
    ]
  )

  const hasStaleHistory = useMemo(
    () => (multiHistory ?? []).some((item) => item.staleHistory),
    [
      multiHistory
    ]
  )

  const chartData = useMemo(() => {
    return generateChartDataFromSnapshots(
      chartAccounts,
      multiHistory ?? [],
      currentBalances,
      startDate,
      endDate
    )
  }, [
    chartAccounts,
    multiHistory,
    currentBalances,
    startDate,
    endDate
  ])

  const noop = () => {
    void 0
  }

  const formattedIncome = formatCurrency(totalIncome)
  const formattedExpense = formatCurrency(totalExpense)
  const formattedNet = formatCurrency(netPeriod)

  return (
    <PageLayout
      title={t('nav.dashboard')}
      description={t('dashboard.overviewSubtitle')}
      quickActions={[
        {
          id: 'add-transaction',
          label: t('dashboard.quickAddTransaction'),
          icon: (
            <Plus
              className="size-4 stroke-[1.5]"
              aria-hidden={true}
            />
          ),
          onClick: noop
        },
        {
          id: 'add-income',
          label: t('dashboard.quickAddIncome'),
          icon: (
            <Plus
              className="size-4 stroke-[1.5]"
              aria-hidden={true}
            />
          ),
          onClick: noop
        },
        {
          id: 'add-bill',
          label: t('dashboard.quickAddBill'),
          icon: (
            <Plus
              className="size-4 stroke-[1.5]"
              aria-hidden={true}
            />
          ),
          onClick: noop
        }
      ]}
      infoCards={[
        {
          id: 'net',
          color: 'blue',
          icon: (
            <Scale
              className="stroke-[1.5]"
              aria-hidden={true}
            />
          ),
          label: t('dashboard.net'),
          value: formattedNet
        },
        {
          id: 'expense',
          color: 'red',
          icon: (
            <TrendingDown
              className="stroke-[1.5]"
              aria-hidden={true}
            />
          ),
          label: t('dashboard.totalExpenses'),
          value: formattedExpense
        },
        {
          id: 'income',
          color: 'green',
          icon: (
            <TrendingUp
              className="stroke-[1.5]"
              aria-hidden={true}
            />
          ),
          label: t('dashboard.totalIncomes'),
          value: formattedIncome
        }
      ]}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          <div className="flex shrink-0 flex-row items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h2 className="type-body-medium text-black">
                {t('dashboard.accountBalanceTitle')}
              </h2>
              {hasStaleHistory ? (
                <p className="type-label text-gray-800">
                  {t('dashboard.staleHistory')}
                </p>
              ) : null}
            </div>
            <IconButton
              variant="text"
              color="subtle"
              onClick={onOpenChartSettings}
              aria-label={t('dashboard.chartSettings')}
              icon={
                <SettingsIcon
                  className="size-4 stroke-[1.5]"
                  aria-hidden={true}
                />
              }
            />
          </div>
          <div className="min-h-0 flex-1 overflow-hidden pb-4">
            <DashboardMultiSeriesLineChart
              data={chartData}
              series={chartAccounts}
            />
          </div>
        </div>

        <div className="flex max-h-[35vh] shrink-0 flex-col overflow-y-auto border-t border-gray-300 pt-6 lg:flex-row lg:items-stretch lg:overflow-hidden">
          <div className="flex w-full min-w-0 flex-col gap-6 lg:min-h-0 lg:w-0 lg:flex-1 lg:overflow-hidden lg:pr-6">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
              <p className="min-w-0 flex-1">
                <span className="type-body-medium text-black">
                  {t('accounts.title')}
                </span>
                <span className="type-body-medium text-black">
                  {t('common.sectionTitleSeparator')}
                </span>
                <span className="type-label text-gray-800">
                  {t('dashboard.availableFundsInline')}{' '}
                  {formatCurrency(totalAvailableFunds)}
                </span>
              </p>
              <Button
                variant="filled"
                color="primary"
                label={t('dashboard.createAccountCTA')}
                icon={
                  <Plus
                    className="size-4 stroke-[1.5]"
                    aria-hidden={true}
                  />
                }
                onClick={noop}
              />
            </div>
            <div className="overflow-x-auto lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="type-label h-auto py-2 pr-2 pl-0 text-gray-800">
                      {t('dashboard.accountNameColumn')}
                    </TableHead>
                    <TableHead className="type-label h-auto py-2 pr-2 pl-0 text-gray-800">
                      {t('accounts.externalId')}
                    </TableHead>
                    <TableHead className="type-label h-auto py-2 pr-2 pl-0 text-gray-800">
                      {t('dashboard.balanceColumn')}
                    </TableHead>
                    <TableHead className="type-label h-auto w-10 py-2 pr-0 pl-0 text-end text-gray-800">
                      <span className="sr-only">{t('common.more')}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="type-body-medium py-2 pr-2 pl-0 text-black">
                        {account.name}
                      </TableCell>
                      <TableCell className="type-body-medium py-2 pr-2 pl-0 text-black">
                        {account.externalIdentifier ?? '—'}
                      </TableCell>
                      <TableCell className="type-body-medium py-2 pr-2 pl-0 text-black">
                        {formatCurrency(currentBalances.get(account.id) ?? 0)}
                      </TableCell>
                      <TableCell className="py-2 pr-0 pl-0 text-end">
                        <IconButton
                          variant="text"
                          color="subtle"
                          aria-label={t('common.more')}
                          onClick={noop}
                          icon={
                            <EllipsisVerticalIcon
                              className="size-4 stroke-[1.5]"
                              aria-hidden={true}
                            />
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <hr className="h-px w-full shrink-0 border-0 bg-gray-300 lg:hidden" />

          <div
            className="hidden w-px shrink-0 self-stretch bg-gray-300 lg:block"
            aria-hidden={true}
          />

          <div className="flex w-full min-w-0 flex-col gap-6 lg:min-h-0 lg:w-0 lg:flex-1 lg:overflow-hidden lg:pl-6">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
              <p className="min-w-0 flex-1">
                <span className="type-body-medium text-black">
                  {t('nav.budgets')}
                </span>
                <span className="type-body-medium text-black">
                  {t('common.sectionTitleSeparator')}
                </span>
                <span className="type-label text-gray-800">
                  {t('dashboard.unbudgetedInline')}{' '}
                  {formatCurrency(unallocatedAmount)}
                </span>
              </p>
              <Button
                variant="filled"
                color="primary"
                label={t('dashboard.createBudgetCTA')}
                icon={
                  <Plus
                    className="size-4 stroke-[1.5]"
                    aria-hidden={true}
                  />
                }
                onClick={noop}
              />
            </div>
            <ul className="flex flex-col gap-6 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
              {budgets.map((budget) => {
                const allocated = budget.allocatedAmount ?? 0
                const remaining = budget.remainingAmount ?? 0
                const spent = budget.spentAmount ?? 0
                const pct =
                  allocated > 0 ? Math.min((spent / allocated) * 100, 100) : 0
                const tone = budgetProgressTone(budget)
                return (
                  <li
                    key={budget.id}
                    className="flex flex-col gap-2"
                  >
                    <div className="flex flex-row items-start justify-between gap-2">
                      <span className="type-body-medium text-black">
                        {budget.name}
                      </span>
                      <IconButton
                        variant="text"
                        color="subtle"
                        aria-label={t('common.more')}
                        onClick={noop}
                        icon={
                          <EllipsisVerticalIcon
                            className="size-4 stroke-[1.5]"
                            aria-hidden={true}
                          />
                        }
                      />
                    </div>
                    <Progress
                      value={pct}
                      className={budgetProgressClass(tone)}
                    />
                    <p className="type-label text-gray-800">
                      {t('dashboard.budgetRemainingStatus', {
                        remaining: formatCurrency(remaining),
                        allocated: formatCurrency(allocated)
                      })}
                    </p>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
