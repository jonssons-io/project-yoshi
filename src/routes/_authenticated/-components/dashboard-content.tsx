import {
  Archive,
  ArrowDownToLine,
  ArrowUpDown,
  ArrowUpFromLine,
  Plus,
  Scale,
  SettingsIcon,
  SquarePen,
  TrendingDown,
  TrendingUp
} from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DashboardMultiSeriesLineChart } from '@/charts/dashboard-multi-series-line-chart/dashboard-multi-series-line-chart'
import { Button } from '@/components/button/button'
import { IconButton } from '@/components/icon-button/icon-button'
import { PageLayout } from '@/components/page-layout/page-layout'
import { Progress } from '@/components/progress/progress'
import { TableRowMenu } from '@/components/table-row-menu/table-row-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/table/table'
import { useAuth } from '@/contexts/auth-context'
import { useDrawer } from '@/drawers'
import {
  useAccountBalanceChart,
  useHouseholdPeriodSummary
} from '@/hooks/api'
import type { ChartDataPoint } from '@/lib/dashboard-utils'
import { getDateRange } from '@/lib/dashboard-utils'
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
  const { householdId } = useAuth()
  const { openDrawer } = useDrawer()

  const { quickSelection, customStartDate, customEndDate, selectedAccountIds } =
    dashboardSettings

  const { startDate, endDate } = getDateRange(
    quickSelection,
    customStartDate,
    customEndDate
  )

  const { data: periodSummary } = useHouseholdPeriodSummary({
    householdId,
    dateFrom: startDate,
    dateTo: endDate,
    enabled: Boolean(householdId)
  })

  const totalIncome = periodSummary?.totalIncome ?? 0
  const totalExpense = periodSummary?.totalExpense ?? 0
  const netPeriod = periodSummary?.net ?? totalIncome - totalExpense

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

  const { data: chartResponse } = useAccountBalanceChart({
    householdId,
    accountIds: chartAccountIds,
    dateFrom: startDate,
    dateTo: endDate,
    enabled: chartAccountIds.length > 0 && !!householdId
  })

  const totalAvailableFunds = useMemo(
    () =>
      accounts.reduce(
        (sum, account) => sum + Number(account.currentBalance ?? account.initialBalance),
        0
      ),
    [
      accounts
    ]
  )

  const hasStaleHistory = useMemo(
    () => (chartResponse?.accounts ?? []).some((a) => a.staleHistory),
    [
      chartResponse
    ]
  )

  const chartData = useMemo((): ChartDataPoint[] => {
    if (!chartResponse) return []
    const { dates, series } = chartResponse
    return dates.map((isoDate, i) => {
      const point: ChartDataPoint = {
        date: isoDate,
        originalDate: new Date(`${isoDate}T00:00:00`)
      }
      for (const account of chartAccounts) {
        point[account.id] = series[account.id]?.[i] ?? 0
      }
      return point
    })
  }, [
    chartResponse,
    chartAccounts
  ])

  const openCreateBudgetDrawer = () => {
    openDrawer('createBudget', {})
  }

  const openCreateAccountDrawer = () => {
    openDrawer('createAccount', {})
  }

  const openEditAccountDrawer = (accountId: string) => {
    openDrawer('editAccount', {
      id: accountId
    })
  }

  const openEditBudgetDrawer = (budgetId: string) => {
    openDrawer('editBudget', {
      id: budgetId
    })
  }

  const openAllocateBudgetDrawer = (budget: DashboardBudget) => {
    openDrawer('allocateBudget', {
      budgetId: budget.id,
      budgetName: budget.name,
      currentAllocation: budget.allocatedAmount ?? 0,
      availableToAllocate: unallocatedAmount
    })
  }

  const openDeallocateBudgetDrawer = (budget: DashboardBudget) => {
    openDrawer('deallocateBudget', {
      budgetId: budget.id,
      budgetName: budget.name,
      currentAllocation: budget.allocatedAmount ?? 0
    })
  }

  const openTransferBudgetAllocationDrawer = (budget: DashboardBudget) => {
    openDrawer('transferBudgetAllocation', {
      budgets: budgets.map((item) => ({
        id: item.id,
        name: item.name,
        allocatedAmount: item.allocatedAmount ?? 0
      })),
      initialFromBudgetId: budget.id
    })
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
          onClick: () => {
            openDrawer('createTransaction', {})
          }
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
          onClick: () => {
            openDrawer('createIncome', {})
          }
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
          onClick: () => {
            openDrawer('createBill', {})
          }
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
                onClick={openCreateAccountDrawer}
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
                        {formatCurrency(account.currentBalance)}
                      </TableCell>
                      <TableCell className="py-2 pr-0 pl-0 text-end">
                        <TableRowMenu
                          aria-label={t('common.more')}
                          items={[
                            {
                              id: 'edit',
                              label: t('dashboard.accountRowMenu.edit'),
                              icon: (
                                <SquarePen
                                  className="stroke-[1.5]"
                                  aria-hidden={true}
                                />
                              ),
                              onSelect: () => {
                                openEditAccountDrawer(account.id)
                              }
                            },
                            {
                              id: 'archive',
                              label: t('dashboard.accountRowMenu.archive'),
                              icon: (
                                <Archive
                                  className="stroke-[1.5]"
                                  aria-hidden={true}
                                />
                              ),
                              destructive: true,
                              separatorBefore: true,
                              onSelect: () => {
                                void 0
                              }
                            }
                          ]}
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
                onClick={openCreateBudgetDrawer}
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
                      <TableRowMenu
                        aria-label={t('common.more')}
                        items={[
                          {
                            id: 'allocate',
                            label: t('dashboard.budgetRowMenu.allocateMoney'),
                            icon: (
                              <ArrowDownToLine
                                className="stroke-[1.5]"
                                aria-hidden={true}
                              />
                            ),
                            onSelect: () => {
                              openAllocateBudgetDrawer(budget)
                            }
                          },
                          {
                            id: 'deallocate',
                            label: t('dashboard.budgetRowMenu.deallocateMoney'),
                            icon: (
                              <ArrowUpFromLine
                                className="stroke-[1.5]"
                                aria-hidden={true}
                              />
                            ),
                            onSelect: () => {
                              openDeallocateBudgetDrawer(budget)
                            }
                          },
                          {
                            id: 'transfer-allocation',
                            label: t(
                              'dashboard.budgetRowMenu.transferAllocation'
                            ),
                            icon: (
                              <ArrowUpDown
                                className="stroke-[1.5]"
                                aria-hidden={true}
                              />
                            ),
                            onSelect: () => {
                              openTransferBudgetAllocationDrawer(budget)
                            }
                          },
                          {
                            id: 'edit',
                            label: t('dashboard.budgetRowMenu.edit'),
                            icon: (
                              <SquarePen
                                className="stroke-[1.5]"
                                aria-hidden={true}
                              />
                            ),
                            onSelect: () => {
                              openEditBudgetDrawer(budget.id)
                            }
                          },
                          {
                            id: 'archive',
                            label: t('dashboard.budgetRowMenu.archive'),
                            icon: (
                              <Archive
                                className="stroke-[1.5]"
                                aria-hidden={true}
                              />
                            ),
                            destructive: true,
                            separatorBefore: true,
                            onSelect: () => {
                              void 0
                            }
                          }
                        ]}
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
