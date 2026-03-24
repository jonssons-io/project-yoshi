/**
 * Budgets page - List and manage budgets
 */

import { createFileRoute, Link } from '@tanstack/react-router'
import {
  AlertTriangleIcon,
  ArrowLeftRight,
  MinusIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { BaseButton } from '@/components/base-button/base-button'
import { Button } from '@/components/button/button'
import { IconButton } from '@/components/icon-button/icon-button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/contexts/auth-context'
import { NoData } from '@/features/no-data/no-data'
import { useBudgetsList, useDeleteBudget } from '@/hooks/api'
import { useAllocationsQuery } from '@/hooks/api/use-allocations'
import { useConfirmDialog } from '@/hooks/use-confirm-dialog'
import { getErrorMessage } from '@/lib/api-error'
import { formatCurrency } from '@/lib/utils'

export const Route = createFileRoute('/_authenticated/budgets/')({
  component: BudgetsPage
})

function BudgetsPage() {
  const { t } = useTranslation()
  const { userId, householdId } = useAuth()
  const { confirm, confirmDialog } = useConfirmDialog()
  const allocationSummary = useAllocationsQuery({
    householdId: householdId ?? '',
    userId,
    enabled: !!householdId
  })

  const {
    data: budgets,
    isLoading,
    refetch,
    error
  } = useBudgetsList({
    householdId,
    userId
  })

  const { mutate: deleteBudget } = useDeleteBudget({
    onSuccess: () => {
      refetch()
      toast.success(t('budgets.deleteSuccess'))
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    }
  })

  if (isLoading || allocationSummary.isLoading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto px-4 pt-6 pb-6">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-0 flex-1 overflow-auto px-4 pt-6 pb-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('budgets.error')}</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : t('common.error')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => refetch()}
              label={t('budgets.tryAgain')}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleCreate = () => {
    void 0
  }

  const handleEdit = (_budget: { id: string; name: string }) => {
    void 0
  }

  const handleDeleteBudget = async (budget: { id: string; name: string }) => {
    const isConfirmed = await confirm({
      description: t('budgets.deleteConfirm', {
        name: budget.name
      }),
      confirmText: t('common.delete')
    })
    if (!isConfirmed) return
    deleteBudget({
      id: budget.id,
      userId
    })
  }

  const handleAllocate = (_budgetId: string) => {
    void 0
  }

  const handleDeallocate = (_budgetId: string) => {
    void 0
  }

  const handleTransfer = (_budgetId?: string) => {
    void 0
  }

  const unallocatedAmount = allocationSummary.data?.unallocated ?? 0
  const totalAllocatedAmount = allocationSummary.data?.totalAllocated ?? 0
  const totalFunds = allocationSummary.data?.totalFunds ?? 0

  if (budgets?.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 overflow-auto px-4 pt-6 pb-6">
        <NoData variant="no-budget" />
      </div>
    )
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 space-y-6 overflow-auto px-4 pt-6 pb-6">
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outlined"
              color="subtle"
              onClick={() => void 0}
              icon={<PlusIcon />}
              label={t('allocation.allocateFunds')}
            />
            <Button
              variant="outlined"
              color="subtle"
              onClick={() => handleTransfer()}
              icon={<ArrowLeftRight />}
              label={t('allocation.transferFunds')}
            />
            <Button
              onClick={handleCreate}
              icon={<PlusIcon />}
              label={t('budgets.create')}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  {t('allocation.totalAvailable')}
                </CardTitle>
                <CardDescription>
                  {t('allocation.allocatedPlusUnallocated')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatCurrency(totalFunds)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  {t('allocation.breakdown')}
                </CardTitle>
                <CardDescription>
                  {t('allocation.unallocatedPoolDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">
                    {t('allocation.allocated')}
                  </div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(totalAllocatedAmount)}
                  </div>
                </div>
                <div className="mx-4 h-8 w-px bg-border" />
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">
                    {t('allocation.unallocated')}
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    {formatCurrency(unallocatedAmount)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {budgets?.map((budget) => (
              <Card key={budget.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle>{budget.name}</CardTitle>
                    {(budget.remainingAmount ?? 0) < 0 ? (
                      <Badge
                        variant="destructive"
                        className="shrink-0"
                      >
                        <AlertTriangleIcon className="h-3 w-3" />
                        {t('allocation.overdrafted')}
                      </Badge>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t('allocation.remaining')}
                      </span>
                      <span
                        className={`font-medium ${
                          (budget.remainingAmount ?? 0) < 0
                            ? 'text-destructive'
                            : ''
                        }`}
                      >
                        {formatCurrency(budget.remainingAmount ?? 0)}
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={
                      (budget.allocatedAmount ?? 0) > 0
                        ? Math.min(
                            ((budget.spentAmount ?? 0) /
                              (budget.allocatedAmount ?? 0)) *
                              100,
                            100
                          )
                        : 0
                    }
                  />
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2">
                  <div className="flex-1">
                    <Button
                      variant="filled"
                      color="subtle"
                      onClick={() => handleAllocate(budget.id)}
                      label={t('allocation.allocate')}
                    />
                  </div>
                  <div className="flex-1">
                    <Button
                      variant="outlined"
                      color="subtle"
                      onClick={() => handleDeallocate(budget.id)}
                      disabled={(budget.remainingAmount ?? 0) <= 0}
                      icon={<MinusIcon />}
                      label={t('allocation.deallocate')}
                    />
                  </div>
                  <div className="flex-1">
                    <Button
                      variant="outlined"
                      color="subtle"
                      onClick={() => handleTransfer(budget.id)}
                      disabled={(budget.remainingAmount ?? 0) <= 0}
                      icon={<ArrowLeftRight />}
                      label={t('allocation.transfer')}
                    />
                  </div>
                  <BaseButton
                    asChild
                    variant="outlined"
                    color="subtle"
                    className="flex-1"
                  >
                    <Link
                      to="/budgets/$budgetId"
                      params={{
                        budgetId: budget.id
                      }}
                    >
                      {t('budgets.viewDetails')}
                    </Link>
                  </BaseButton>
                  <IconButton
                    variant="outlined"
                    color="subtle"
                    icon={<PencilIcon className="h-4 w-4" />}
                    onClick={() =>
                      handleEdit({
                        id: budget.id,
                        name: budget.name
                      })
                    }
                  />
                  <IconButton
                    variant="outlined"
                    color="subtle"
                    icon={<TrashIcon className="h-4 w-4" />}
                    onClick={() =>
                      handleDeleteBudget({
                        id: budget.id,
                        name: budget.name
                      })
                    }
                  />
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
      {confirmDialog}
    </>
  )
}
