import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Alert } from '@/components/alert'
import { Button } from '@/components/button/button'
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
import type { BudgetAllocationShortfall } from '@/drawers/drawers/create-transaction-drawer/budget-allocation-shortfall'
import { cn, formatCurrency } from '@/lib/utils'

export type ImportAllocationChoice = {
  budgetId: string
  amount: number
}

type DialogRequest = {
  shortfalls: BudgetAllocationShortfall[]
  unallocatedAmount: number
  existingUnallocated: number
  pendingIncomeAmount: number
  resolve: (value: ImportAllocationChoice[] | null) => void
}

type DialogState = DialogRequest & {
  open: boolean
}

function sumEnteredAmounts(
  amounts: Record<string, number | null>,
  budgetIds: string[]
): number {
  return budgetIds.reduce((sum, budgetId) => {
    const value = amounts[budgetId]
    if (value == null || Number.isNaN(value)) return sum
    return sum + value
  }, 0)
}

function formatSignedCurrency(amount: number): string {
  const absolute = formatCurrency(Math.abs(amount))
  if (amount > 0) return `+${absolute}`
  if (amount < 0) return `-${absolute}`
  return absolute
}

function projectedBudgetBalance(
  shortfall: BudgetAllocationShortfall,
  allocatedAmount: number | null
): number {
  const allocation = allocatedAmount ?? 0
  return shortfall.remainingAmount + allocation - shortfall.expenseAmount
}

function ImportAllocationFundsAlert({
  remainingUnallocated
}: {
  remainingUnallocated: number
}) {
  const { t } = useTranslation()

  return (
    <Alert variant="info">
      {t('statementImport.allocation.unallocatedFunds', {
        amount: formatCurrency(remainingUnallocated)
      })}
    </Alert>
  )
}

export function useImportBudgetAllocationDialog() {
  const { t } = useTranslation()
  const [dialogState, setDialogState] = useState<DialogState | null>(null)
  const [amounts, setAmounts] = useState<Record<string, number | null>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const promptImportAllocations = useCallback(
    (params: {
      shortfalls: BudgetAllocationShortfall[]
      unallocatedAmount: number
      existingUnallocated: number
      pendingIncomeAmount: number
    }) => {
      return new Promise<ImportAllocationChoice[] | null>((resolve) => {
        setDialogState({
          open: true,
          ...params,
          resolve
        })
      })
    },
    []
  )

  const closeDialog = useCallback((result: ImportAllocationChoice[] | null) => {
    setDialogState((current) => {
      current?.resolve(result)
      return null
    })
    setAmounts({})
    setFormError(null)
  }, [])

  const shortfalls = dialogState?.shortfalls ?? []
  const initialUnallocated = dialogState?.unallocatedAmount ?? 0
  const budgetIds = useMemo(
    () => shortfalls.map((item) => item.budgetId),
    [
      shortfalls
    ]
  )

  useEffect(() => {
    if (!dialogState?.open) return
    setAmounts(
      Object.fromEntries(
        shortfalls.map((item) => [
          item.budgetId,
          item.shortfall
        ])
      )
    )
    setFormError(null)
  }, [
    dialogState?.open,
    shortfalls
  ])

  const enteredTotal = useMemo(
    () => sumEnteredAmounts(amounts, budgetIds),
    [
      amounts,
      budgetIds
    ]
  )
  const remainingUnallocated = initialUnallocated - enteredTotal

  const validateSubmit = useCallback((): string | null => {
    if (enteredTotal > initialUnallocated) {
      return t('statementImport.allocation.totalExceedsUnallocated')
    }

    for (const item of shortfalls) {
      const value = amounts[item.budgetId]
      if (value == null || Number.isNaN(value) || value <= 0) {
        return t('statementImport.allocation.amountRequired', {
          budgetName: item.budgetName
        })
      }
      if (value < item.shortfall) {
        return t('statementImport.allocation.belowShortfall', {
          budgetName: item.budgetName,
          amount: formatCurrency(item.shortfall)
        })
      }
    }

    return null
  }, [
    amounts,
    enteredTotal,
    initialUnallocated,
    shortfalls,
    t
  ])

  const handleConfirm = useCallback(() => {
    const error = validateSubmit()
    if (error) {
      setFormError(error)
      return
    }

    closeDialog(
      shortfalls.map((item) => ({
        budgetId: item.budgetId,
        amount: amounts[item.budgetId] as number
      }))
    )
  }, [
    amounts,
    closeDialog,
    shortfalls,
    validateSubmit
  ])

  const dialog = useMemo(
    () => (
      <AlertDialog
        open={dialogState?.open ?? false}
        onOpenChange={(open) => {
          if (!open) closeDialog(null)
        }}
      >
        <AlertDialogContent className="flex max-h-[min(90vh,720px)] flex-col gap-4 overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('statementImport.allocation.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('statementImport.allocation.intro')}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <ImportAllocationFundsAlert
            remainingUnallocated={remainingUnallocated}
          />

          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[minmax(0,1fr)_9.5rem] items-center gap-x-4 gap-y-3">
              <span className="type-label text-gray-800">
                {t('statementImport.allocation.budgetsColumn')}
              </span>
              <span className="type-label text-gray-800">
                {t('statementImport.allocation.allocateColumn')}
              </span>
              {shortfalls.map((item) => (
                <ImportAllocationRow
                  key={item.budgetId}
                  shortfall={item}
                  value={amounts[item.budgetId] ?? null}
                  maxAmount={
                    remainingUnallocated + (amounts[item.budgetId] ?? 0)
                  }
                  onChange={(next) => {
                    setFormError(null)
                    setAmounts((current) => ({
                      ...current,
                      [item.budgetId]: next
                    }))
                  }}
                />
              ))}
            </div>
            {formError ? (
              <p className="type-body-medium text-red-700">{formError}</p>
            ) : null}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <Button
              type="button"
              variant="filled"
              color="primary"
              label={t('statementImport.allocation.submit')}
              disabled={initialUnallocated <= 0}
              onClick={handleConfirm}
            />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    ),
    [
      amounts,
      closeDialog,
      dialogState?.open,
      formError,
      handleConfirm,
      initialUnallocated,
      remainingUnallocated,
      shortfalls,
      t
    ]
  )

  return {
    promptImportAllocations,
    importAllocationDialog: dialog
  }
}

function ImportAllocationRow({
  shortfall,
  value,
  maxAmount,
  onChange
}: {
  shortfall: BudgetAllocationShortfall
  value: number | null
  maxAmount: number
  onChange: (value: number | null) => void
}) {
  const { t } = useTranslation()
  const fieldId = useId()
  const projectedBalance = projectedBudgetBalance(shortfall, value)

  return (
    <>
      <p className="type-body-medium text-gray-950">
        {`${shortfall.budgetName}: ${formatSignedCurrency(projectedBalance)}`}
      </p>
      <InputShell className="w-full">
        <span className="type-label shrink-0 text-gray-500">
          {t('common.currencyCode')}
        </span>
        <input
          id={fieldId}
          type="number"
          inputMode="decimal"
          step="0.01"
          min={0}
          max={maxAmount > 0 ? maxAmount : undefined}
          value={value == null || Number.isNaN(value) ? '' : value}
          onChange={(event) => {
            const raw = event.target.value
            if (raw === '') {
              onChange(null)
              return
            }
            const parsed = event.target.valueAsNumber
            onChange(Number.isFinite(parsed) ? parsed : null)
          }}
          className={cn(inputInnerClassName, numberInputNoSpinnersClassName)}
        />
      </InputShell>
    </>
  )
}
