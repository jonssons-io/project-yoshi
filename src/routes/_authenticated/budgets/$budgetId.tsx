/**
 * Budget detail page - View and manage a specific budget
 */

import { createFileRoute, Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'
import { useBudgetById, useTransactionsList } from '@/hooks/api'
import { useListAllocations } from '@/hooks/api/use-allocations'
import { formatCurrency } from '@/lib/utils'

export const Route = createFileRoute('/_authenticated/budgets/$budgetId')({
  component: BudgetDetailPage
})

function BudgetDetailPage() {
  const { t } = useTranslation()
  const { budgetId } = Route.useParams()
  const { userId, householdId } = useAuth()

  const { data: budget, isLoading } = useBudgetById({
    budgetId,
    userId,
    enabled: true
  })
  const { data: transactions } = useTransactionsList({
    householdId,
    budgetId,
    userId,
    enabled: !!householdId && !!budgetId
  })
  const { data: allocations } = useListAllocations({
    budgetId,
    userId,
    enabled: !!budgetId
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  }

  if (!budget) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('budgets.notFound')}</CardTitle>
          <CardDescription>{t('budgets.notFoundDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/budgets">{t('budgets.backToBudgets')}</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const allocatedAmount = budget.allocatedAmount ?? 0
  const spentAmount = budget.spentAmount ?? 0
  const remainingAmount = budget.remainingAmount ?? 0
  const isOverdrafted = remainingAmount < 0
  const recentTransactions = (transactions ?? []).slice(0, 5)
  const allocationHistory = [
    ...(allocations ?? [])
  ]
    .sort(
      (
        a: {
          date: Date
        },
        b: {
          date: Date
        }
      ) => b.date.getTime() - a.date.getTime()
    )
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>
              {t('budgets.detail.allocated', {
                defaultValue: 'Allocated'
              })}
            </CardTitle>
            <CardDescription>
              {t('budgets.detail.allocatedDescription', {
                defaultValue: 'Total funds assigned to this envelope'
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(allocatedAmount)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {t('budgets.detail.spent', {
                defaultValue: 'Spent'
              })}
            </CardTitle>
            <CardDescription>
              {t('budgets.detail.spentDescription', {
                defaultValue: 'Total effective spending in this envelope'
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(spentAmount)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {t('budgets.detail.remaining', {
                defaultValue: 'Remaining'
              })}
            </CardTitle>
            <CardDescription>
              {t('budgets.detail.remainingDescription', {
                defaultValue: 'Available funds left in this envelope'
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              className={`text-3xl font-bold ${
                isOverdrafted ? 'text-destructive' : ''
              }`}
            >
              {formatCurrency(remainingAmount)}
            </div>
            {isOverdrafted ? (
              <Badge variant="destructive">
                {t('budgets.detail.overdrafted', {
                  defaultValue: 'Overdrafted'
                })}
              </Badge>
            ) : (
              <Badge variant="outline">
                {t('budgets.detail.healthy', {
                  defaultValue: 'Healthy'
                })}
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              {t('budgets.detail.allocationHistory', {
                defaultValue: 'Allocation History'
              })}
            </CardTitle>
            <CardDescription>
              {t('budgets.detail.allocationHistoryDescription', {
                defaultValue: 'Recent funding movements into this envelope'
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {allocationHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('budgets.detail.noAllocations', {
                  defaultValue: 'No allocations yet.'
                })}
              </p>
            ) : (
              <div className="space-y-3">
                {allocationHistory.map(
                  (allocation: { id: string; amount: number; date: Date }) => (
                    <div
                      key={allocation.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div>
                        <p className="font-medium">
                          {formatCurrency(allocation.amount)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(allocation.date, 'PP')}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {t('allocation.allocation', {
                          defaultValue: 'Allocation'
                        })}
                      </Badge>
                    </div>
                  )
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('transactions.title')}</CardTitle>
            <CardDescription>
              {t('budgets.detail.transactionsDescription', {
                defaultValue:
                  'Recent spending and money movement for this envelope'
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('budgets.detail.noTransactions', {
                  defaultValue: 'No transactions yet.'
                })}
              </p>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <p className="font-medium">{transaction.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(transaction.date, 'PP')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(transaction.amount)}
                      </p>
                      <Badge variant="outline">{transaction.type}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('budgets.quickActions')}</CardTitle>
          <CardDescription>{t('budgets.manageData')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link
                to="/transactions"
                search={{
                  budgetId
                }}
              >
                {t('budgets.viewTransactions')}
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
            >
              <Link to="/budgets">{t('allocation.allocateFunds')}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
