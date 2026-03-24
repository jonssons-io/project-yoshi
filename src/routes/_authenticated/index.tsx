import { createFileRoute } from '@tanstack/react-router'
import { type ReactNode, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { PageLayout } from '@/components/page-layout/page-layout'
import { useAuth } from '@/contexts/auth-context'
import { useDrawer } from '@/drawers'
import { NoData } from '@/features/no-data/no-data'
import {
  useAccountBalancesList,
  useAccountsList,
  useAllocationsQuery,
  useBudgetsList
} from '@/hooks/api'
import { DashboardContent } from './-components/dashboard-content'
import { useDashboardSettings } from './-components/use-dashboard-settings'

export const Route = createFileRoute('/_authenticated/')({
  component: Dashboard
})

function Dashboard() {
  const { t } = useTranslation()
  const { userId, householdId } = useAuth()
  const dashboardTitle = t('nav.dashboard')
  const dashboardDescription = t('dashboard.overviewSubtitle')

  const { data: budgets, isLoading: budgetsLoading } = useBudgetsList({
    householdId,
    userId
  })

  const { data: accounts, isLoading: accountsLoading } = useAccountsList({
    householdId,
    userId,
    enabled: !!householdId,
    excludeArchived: true
  })

  const dashboardSettings = useDashboardSettings({
    userId: userId ?? '',
    accounts: accounts ?? undefined
  })

  const { openDrawer } = useDrawer()

  const accountIds = useMemo(
    () => (accounts ?? []).map((account) => account.id),
    [
      accounts
    ]
  )

  const { data: accountBalances, isLoading: accountBalancesLoading } =
    useAccountBalancesList({
      householdId,
      userId,
      accountIds,
      includeArchived: false,
      enabled: !!householdId && accountIds.length > 0
    })

  const { data: allocationSummary, isLoading: allocationSummaryLoading } =
    useAllocationsQuery({
      householdId: householdId ?? '',
      userId: userId ?? '',
      enabled: !!householdId && !!userId
    })

  const balancesByAccountId = useMemo(() => {
    const balances = new Map<string, number>()
    for (const balance of accountBalances ?? []) {
      balances.set(balance.account.id, Number(balance.currentBalance))
    }
    return balances
  }, [
    accountBalances
  ])

  const dashboardAccounts = (accounts ?? []).map((account) => ({
    id: account.id,
    name: account.name,
    initialBalance: account.initialBalance,
    currentBalance:
      balancesByAccountId.get(account.id) ?? Number(account.initialBalance),
    externalIdentifier: account.externalIdentifier ?? null
  }))

  const openChartSettingsDrawer = useCallback(() => {
    openDrawer('dashboardChartSettings', {
      accounts: dashboardAccounts.map((account) => ({
        id: account.id,
        name: account.name
      })),
      selectedAccountIds: dashboardSettings.selectedAccountIds,
      onApply: dashboardSettings.updateSelectedAccounts
    })
  }, [
    dashboardAccounts,
    dashboardSettings.selectedAccountIds,
    dashboardSettings.updateSelectedAccounts,
    openDrawer
  ])

  const withDashboardChrome = (content: ReactNode) => (
    <PageLayout
      title={dashboardTitle}
      description={dashboardDescription}
    >
      {content}
    </PageLayout>
  )

  const isDashboardDataLoading =
    householdId &&
    (budgetsLoading ||
      accountsLoading ||
      accountBalancesLoading ||
      allocationSummaryLoading)

  if (isDashboardDataLoading) {
    return withDashboardChrome(
      <div className="flex flex-1 items-center justify-center py-8">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  }

  if (!householdId) {
    return withDashboardChrome(<NoData variant="no-household" />)
  }

  if (dashboardAccounts.length === 0) {
    return withDashboardChrome(<NoData variant="no-account" />)
  }

  if (!(budgets?.length ?? 0)) {
    return withDashboardChrome(<NoData variant="no-budget" />)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <DashboardContent
        accounts={dashboardAccounts}
        budgets={budgets ?? []}
        dashboardSettings={dashboardSettings}
        onOpenChartSettings={openChartSettingsDrawer}
        unallocatedAmount={allocationSummary?.unallocated ?? 0}
      />
    </div>
  )
}
