import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { PageLayout } from '@/components/page-layout/page-layout'
import { useAuth } from '@/contexts/auth-context'
import { useDrawer } from '@/drawers'
import { NoData } from '@/features/no-data/no-data'
import { NoHouseholdOnboarding } from '@/features/no-data/no-household-onboarding'
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

  const isParentDataLoading = Boolean(
    householdId &&
      (budgetsLoading ||
        accountsLoading ||
        accountBalancesLoading ||
        allocationSummaryLoading)
  )

  if (!householdId) {
    return (
      <PageLayout
        title={dashboardTitle}
        description={dashboardDescription}
      >
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
          <NoHouseholdOnboarding />
        </div>
      </PageLayout>
    )
  }

  if (budgetsLoading) {
    return (
      <PageLayout
        title={dashboardTitle}
        description={dashboardDescription}
        loadingHeader={true}
        loadingContent={true}
      >
        {null}
      </PageLayout>
    )
  }

  if (!(budgets?.length ?? 0)) {
    return (
      <PageLayout
        title={dashboardTitle}
        description={dashboardDescription}
      >
        <NoData
          variant="no-budget"
          illustrationSize="lg"
          onAction={() => {
            openDrawer('createBudget', {})
          }}
        />
      </PageLayout>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <DashboardContent
        accounts={dashboardAccounts}
        budgets={budgets ?? []}
        dashboardSettings={dashboardSettings}
        onOpenChartSettings={openChartSettingsDrawer}
        unallocatedAmount={allocationSummary?.unallocated ?? 0}
        isParentDataLoading={isParentDataLoading}
      />
    </div>
  )
}
