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
import { useTransferAllocationMutation } from '@/hooks/api/use-allocations'
import { formatCurrency } from '@/lib/utils'

interface TransferDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  householdId: string
  userId: string
  preselectedSourceBudgetId?: string
}

export function TransferDrawer({
  open,
  onOpenChange,
  householdId,
  userId,
  preselectedSourceBudgetId
}: TransferDrawerProps) {
  const [amount, setAmount] = React.useState('')
  const [fromBudgetId, setFromBudgetId] = React.useState(
    preselectedSourceBudgetId || ''
  )
  const [toBudgetId, setToBudgetId] = React.useState('')
  const { t } = useTranslation()

  const amountId = React.useId()
  const fromBudgetIdId = React.useId()
  const toBudgetIdId = React.useId()

  const budgetsQuery = useBudgetsList({
    householdId,
    userId
  })
  const transferMutation = useTransferAllocationMutation()

  React.useEffect(() => {
    if (open) {
      setAmount('')
      setFromBudgetId(preselectedSourceBudgetId || '')
      setToBudgetId('')
    }
  }, [
    open,
    preselectedSourceBudgetId
  ])

  const budgets = budgetsQuery.data || []
  const sourceBudget = budgets.find((budget) => budget.id === fromBudgetId)
  const sourceRemaining = sourceBudget?.remainingAmount ?? 0
  const numericAmount = Number.parseFloat(amount || '0')
  const hasExceededSource =
    Number.isFinite(numericAmount) && numericAmount > sourceRemaining
  const isInvalidAmount = !amount || numericAmount <= 0 || hasExceededSource

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fromBudgetId || !toBudgetId || isInvalidAmount) return

    transferMutation.mutate(
      {
        fromBudgetId,
        toBudgetId,
        amount: numericAmount,
        userId
      },
      {
        onSuccess: () => {
          onOpenChange(false)
        }
      }
    )
  }

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
            <DrawerTitle>{t('allocation.transferDrawer.title')}</DrawerTitle>
            <DrawerDescription>
              {t('allocation.transferDrawer.description')}
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor={fromBudgetIdId}>
                {t('allocation.transferDrawer.fromBudget')}
              </Label>
              <Select
                value={fromBudgetId}
                onValueChange={setFromBudgetId}
              >
                <SelectTrigger id={fromBudgetIdId}>
                  <SelectValue
                    placeholder={t('allocation.transferDrawer.selectSource')}
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
              <Label htmlFor={toBudgetIdId}>
                {t('allocation.transferDrawer.toBudget')}
              </Label>
              <Select
                value={toBudgetId}
                onValueChange={setToBudgetId}
              >
                <SelectTrigger id={toBudgetIdId}>
                  <SelectValue
                    placeholder={t('allocation.transferDrawer.selectDest')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {budgets
                    .filter((b) => b.id !== fromBudgetId)
                    .map((budget) => (
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
                min="0.01"
                step="0.01"
                placeholder={t('forms.zeroPlaceholder')}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t('allocation.availableToTransfer', {
                  amount: formatCurrency(sourceRemaining)
                })}
              </p>
              {hasExceededSource ? (
                <p className="text-xs text-destructive">
                  {t('allocation.exceedsSourceRemaining')}
                </p>
              ) : null}
            </div>
          </div>
          <DrawerFooter>
            <BaseButton
              type="submit"
              disabled={
                transferMutation.isPending ||
                !fromBudgetId ||
                !toBudgetId ||
                isInvalidAmount
              }
            >
              {transferMutation.isPending
                ? t('allocation.transferDrawer.transferring')
                : t('allocation.transferDrawer.transfer')}
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
