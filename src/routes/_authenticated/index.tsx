import { createFileRoute } from '@tanstack/react-router'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DashboardContent } from '@/components/dashboard/DashboardContent'
import { SetupPrompt } from '@/components/dashboard/SetupPrompt'
import { useAuth } from '@/contexts/auth-context'
import {
  useAccountBalancesList,
  useAccountsList,
  useAllocationsQuery,
  useBudgetsList
} from '@/hooks/api'

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

  const { data: accounts, isLoading: accountsLoading } = useAccountsList({
    householdId,
    userId,
    enabled: !!householdId,
    excludeArchived: true
  })

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

  if (
    householdId &&
    (budgetsLoading ||
      accountsLoading ||
      accountBalancesLoading ||
      allocationSummaryLoading)
  ) {
    return (
      <div className="flex items-center justify-center">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  }

  if (!householdId) {
    return <SetupPrompt variant="no-household" />
  }

  if (dashboardAccounts.length === 0) {
    return <SetupPrompt variant="no-account" />
  }

  if (!(budgets?.length ?? 0)) {
    return <SetupPrompt variant="no-budget" />
  }

  return (
    <DashboardContent
      accounts={dashboardAccounts}
      budgets={budgets ?? []}
      unallocatedAmount={allocationSummary?.unallocated ?? 0}
    />
  )
}
