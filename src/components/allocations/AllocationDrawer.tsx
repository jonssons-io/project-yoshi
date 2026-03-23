import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { BaseButton } from '@/components/base-button/base-button'
import { Button } from '@/components/button/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useBudgetsList } from '@/hooks/api/queries/use-budgets-query'
import {
  useAllocationsQuery,
  useCreateAllocationMutation,
  useDeallocateAllocationMutation
} from '@/hooks/api/use-allocations'
import { formatCurrency } from '@/lib/utils'

interface AllocationDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  householdId: string
  userId: string
  preselectedBudgetId?: string
  mode?: 'allocate' | 'deallocate'
}

export function AllocationDrawer({
  open,
  onOpenChange,
  householdId,
  userId,
  preselectedBudgetId,
  mode = 'allocate'
}: AllocationDrawerProps) {
  const [amount, setAmount] = React.useState('')
  const [budgetId, setBudgetId] = React.useState(preselectedBudgetId || '')
  const { t } = useTranslation()

  const amountId = React.useId()
  const budgetSelectId = React.useId()

  const budgetsQuery = useBudgetsList({
    householdId,
    userId
  })
  const unallocatedQuery = useAllocationsQuery({
    householdId,
    userId,
    enabled: open
  })
  const createMutation = useCreateAllocationMutation()
  const deallocateMutation = useDeallocateAllocationMutation()

  React.useEffect(() => {
    if (open) {
      setAmount('')
      setBudgetId(preselectedBudgetId || '')
    }
  }, [
    open,
    preselectedBudgetId
  ])

  const budgets = budgetsQuery.data || []
  const selectedBudget = budgets.find((budget) => budget.id === budgetId)
  const availableAmount =
    mode === 'allocate'
      ? (unallocatedQuery.data?.unallocated ?? 0)
      : (selectedBudget?.remainingAmount ?? 0)
  const numericAmount = Number.parseFloat(amount || '0')
  const hasExceededAvailable =
    Number.isFinite(numericAmount) && numericAmount > availableAmount
  const isInvalidAmount = !amount || numericAmount <= 0 || hasExceededAvailable

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!budgetId || isInvalidAmount) return

    const mutation = mode === 'allocate' ? createMutation : deallocateMutation
    mutation.mutate(
      {
        budgetId,
        amount: mode === 'allocate' ? numericAmount : -Math.abs(numericAmount),
        userId
      },
      {
        onSuccess: () => {
          onOpenChange(false)
        }
      }
    )
  }

  const activeMutation =
    mode === 'allocate' ? createMutation : deallocateMutation
  const title =
    mode === 'allocate'
      ? t('allocation.drawer.allocateTitle')
      : t('allocation.drawer.deallocateTitle')
  const description =
    mode === 'allocate'
      ? t('allocation.drawer.allocateDescription')
      : t('allocation.drawer.deallocateDescription')
  const submitLabel =
    mode === 'allocate'
      ? t('allocation.drawer.allocateAction')
      : t('allocation.drawer.deallocateAction')
  const pendingLabel =
    mode === 'allocate'
      ? t('allocation.drawer.allocating')
      : t('allocation.drawer.deallocating')

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      direction="right"
    >
      <DrawerContent>
        <form
          onSubmit={handleSubmit}
          className="h-full flex flex-col"
        >
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor={budgetSelectId}>
                {t('allocation.drawer.budget')}
              </Label>
              <Select
                value={budgetId}
                onValueChange={setBudgetId}
                disabled={!!preselectedBudgetId}
              >
                <SelectTrigger id={budgetSelectId}>
                  <SelectValue
                    placeholder={t('allocation.drawer.selectBudget')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {budgets.map((budget) => (
                    <SelectItem
                      key={budget.id}
                      value={budget.id}
                    >
                      {budget.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={amountId}>{t('common.amount')}</Label>
              <Input
                id={amountId}
                type="number"
                min="0"
                placeholder={t('forms.zeroPlaceholder')}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {mode === 'allocate'
                  ? t('allocation.availableToAllocate', {
                      amount: formatCurrency(availableAmount)
                    })
                  : t('allocation.availableToDeallocate', {
                      amount: formatCurrency(availableAmount)
                    })}
              </p>
              {hasExceededAvailable ? (
                <p className="text-xs text-destructive">
                  {t('allocation.exceedsAvailable')}
                </p>
              ) : null}
            </div>
          </div>
          <DrawerFooter>
            <BaseButton
              type="submit"
              disabled={
                activeMutation.isPending || !budgetId || isInvalidAmount
              }
            >
              {activeMutation.isPending ? pendingLabel : submitLabel}
            </BaseButton>
            <Button
              variant="outlined"
              color="subtle"
              onClick={() => onOpenChange(false)}
              type="button"
              label={t('common.cancel')}
            />
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
