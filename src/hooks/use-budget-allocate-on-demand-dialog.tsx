import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/button/button'
import { FormField } from '@/components/form-field/form-field'
import {
  InputShell,
  inputInnerClassName,
  numberInputNoSpinnersClassName
} from '@/components/input-shell/input-shell'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import type { BudgetAllocationShortfall } from '@/drawers/drawers/create-transaction-drawer/budget-allocation-shortfall'
import { cn, formatCurrency } from '@/lib/utils'

export type BudgetAllocateOnDemandChoice = {
  budgetId: string
  amount: number
}

type DialogRequest = {
  shortfalls: BudgetAllocationShortfall[]
  unallocatedAmount: number
  confirmLabel: string
  resolve: (value: BudgetAllocateOnDemandChoice | null) => void
}

type DialogState = DialogRequest & {
  open: boolean
}

export function useBudgetAllocateOnDemandDialog() {
  const { t } = useTranslation()
  const amountFieldId = useId()
  const budgetFieldId = useId()
  const [dialogState, setDialogState] = useState<DialogState | null>(null)
  const [selectedBudgetId, setSelectedBudgetId] = useState('')
  const [amount, setAmount] = useState<number | null>(null)
  const [amountError, setAmountError] = useState<string | null>(null)

  const promptAllocation = useCallback(
    (params: {
      shortfalls: BudgetAllocationShortfall[]
      unallocatedAmount: number
      confirmLabel: string
    }) => {
      return new Promise<BudgetAllocateOnDemandChoice | null>((resolve) => {
        setDialogState({
          open: true,
          ...params,
          resolve
        })
      })
    },
    []
  )

  const closeDialog = useCallback(
    (result: BudgetAllocateOnDemandChoice | null) => {
      setDialogState((current) => {
        current?.resolve(result)
        return null
      })
      setAmount(null)
      setAmountError(null)
      setSelectedBudgetId('')
    },
    []
  )

  const shortfalls = dialogState?.shortfalls ?? []
  const unallocatedAmount = dialogState?.unallocatedAmount ?? 0
  const showBudgetSelect = shortfalls.length > 1

  useEffect(() => {
    if (!dialogState?.open) return
    setSelectedBudgetId(shortfalls[0]?.budgetId ?? '')
    setAmount(null)
    setAmountError(null)
  }, [
    dialogState?.open,
    shortfalls
  ])

  const budgetOptions = useMemo(
    () =>
      shortfalls.map((item) => ({
        value: item.budgetId,
        label: item.budgetName
      })),
    [
      shortfalls
    ]
  )

  const validateAmount = useCallback(
    (value: number | null): string | null => {
      if (value == null || Number.isNaN(value) || value <= 0) {
        return t('validation.positive')
      }
      if (value > unallocatedAmount) {
        return t('allocation.exceedsAvailable')
      }
      return null
    },
    [
      t,
      unallocatedAmount
    ]
  )

  const handleConfirm = useCallback(() => {
    if (!dialogState) return

    if (!selectedBudgetId) {
      return
    }

    const error = validateAmount(amount)
    if (error) {
      setAmountError(error)
      return
    }

    closeDialog({
      budgetId: selectedBudgetId,
      amount: amount as number
    })
  }, [
    amount,
    closeDialog,
    dialogState,
    selectedBudgetId,
    validateAmount
  ])

  const dialog = useMemo(
    () => (
      <AlertDialog
        open={dialogState?.open ?? false}
        onOpenChange={(open) => {
          if (!open) closeDialog(null)
        }}
      >
        <AlertDialogContent className="flex max-h-[min(90vh,640px)] flex-col gap-4 overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('transactions.insufficientBudgetAllocateTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-3">
                <p>{t('transactions.insufficientBudgetAllocateIntro')}</p>
                <ul className="flex list-disc flex-col gap-1 pl-5">
                  {shortfalls.map((item) => (
                    <li key={item.budgetId}>
                      {t('transactions.insufficientBudgetShortfallLine', {
                        budgetName: item.budgetName,
                        remaining: formatCurrency(item.remainingAmount),
                        shortfall: formatCurrency(item.shortfall)
                      })}
                    </li>
                  ))}
                </ul>
                <p className="type-label text-black">
                  {t('transactions.unallocatedPoolAvailable', {
                    amount: formatCurrency(unallocatedAmount)
                  })}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex flex-col gap-4">
            {showBudgetSelect ? (
              <FormField
                label={t('allocation.drawer.budget')}
                fieldId={budgetFieldId}
              >
                <Select
                  value={selectedBudgetId}
                  onValueChange={setSelectedBudgetId}
                >
                  <SelectTrigger
                    id={budgetFieldId}
                    className="w-full"
                  >
                    <SelectValue placeholder={t('forms.selectBudget')} />
                  </SelectTrigger>
                  <SelectContent>
                    {budgetOptions.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            ) : null}

            <FormField
              label={t('transactions.allocateAmountLabel')}
              fieldId={amountFieldId}
              error={amountError}
            >
              <InputShell data-invalid={amountError ? true : undefined}>
                <span className="type-label shrink-0 text-gray-500">
                  {t('common.currencyCode')}
                </span>
                <input
                  id={amountFieldId}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  max={unallocatedAmount > 0 ? unallocatedAmount : undefined}
                  value={amount == null || Number.isNaN(amount) ? '' : amount}
                  disabled={unallocatedAmount <= 0}
                  onChange={(event) => {
                    const value = event.target.value
                    if (value === '') {
                      setAmount(null)
                      setAmountError(null)
                      return
                    }
                    const parsed = event.target.valueAsNumber
                    const next = Number.isFinite(parsed) ? parsed : null
                    setAmount(next)
                    setAmountError(validateAmount(next))
                  }}
                  aria-invalid={amountError ? true : undefined}
                  className={cn(
                    inputInnerClassName,
                    numberInputNoSpinnersClassName
                  )}
                />
              </InputShell>
            </FormField>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <Button
              type="button"
              variant="filled"
              color="primary"
              label={dialogState?.confirmLabel ?? t('common.confirm')}
              disabled={unallocatedAmount <= 0}
              onClick={handleConfirm}
            />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    ),
    [
      amount,
      amountError,
      amountFieldId,
      budgetFieldId,
      budgetOptions,
      closeDialog,
      dialogState?.confirmLabel,
      dialogState?.open,
      handleConfirm,
      selectedBudgetId,
      shortfalls,
      showBudgetSelect,
      t,
      unallocatedAmount,
      validateAmount
    ]
  )

  return {
    promptAllocation,
    allocateOnDemandDialog: dialog
  }
}
