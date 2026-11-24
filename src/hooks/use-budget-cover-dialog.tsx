import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

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
import {
  type BudgetCoverDonor,
  type PromptBudgetPulls,
  suggestBudgetPulls
} from '@/drawers/drawers/create-transaction-drawer/budget-cover-plan'
import { cn, formatCurrency } from '@/lib/utils'

type DialogRequest = Parameters<PromptBudgetPulls>[0] & {
  resolve: (value: Record<string, number> | null) => void
}

type Pulls = Record<string, number | null>

function toCents(amount: number | null | undefined): number {
  return amount == null || Number.isNaN(amount) ? 0 : Math.round(amount * 100)
}

function pulledCents(pulls: Pulls, donors: BudgetCoverDonor[]): number {
  return donors.reduce((sum, donor) => sum + toCents(pulls[donor.budgetId]), 0)
}

/**
 * Shown only when the unallocated pool cannot cover an expense: lists the
 * budgets that have allocation to spare and asks how much to move from each.
 * The amounts must add up to exactly what is missing.
 */
export function useBudgetCoverDialog() {
  const { t } = useTranslation()
  const [request, setRequest] = useState<DialogRequest | null>(null)
  const [pulls, setPulls] = useState<Pulls>({})
  const [formError, setFormError] = useState<string | null>(null)

  const promptBudgetPulls = useCallback<PromptBudgetPulls>((params) => {
    return new Promise((resolve) => {
      setRequest({
        ...params,
        resolve
      })
    })
  }, [])

  const closeDialog = useCallback((result: Record<string, number> | null) => {
    setRequest((current) => {
      current?.resolve(result)
      return null
    })
    setPulls({})
    setFormError(null)
  }, [])

  const donors = request?.donors ?? NO_DONORS
  const shortfalls = request?.shortfalls ?? NO_SHORTFALLS
  const needed = request?.needed ?? 0

  useEffect(() => {
    if (!request) return
    setPulls(suggestBudgetPulls(request.donors, request.needed))
    setFormError(null)
  }, [
    request
  ])

  const totalSpareCents = donors.reduce(
    (sum, donor) => sum + toCents(donor.spare),
    0
  )
  const canCover = totalSpareCents >= toCents(needed)
  const leftToCoverCents = toCents(needed) - pulledCents(pulls, donors)

  const handleConfirm = useCallback(() => {
    for (const donor of donors) {
      if (toCents(pulls[donor.budgetId]) > toCents(donor.spare)) {
        setFormError(
          t('transactions.coverExceedsDonor', {
            budgetName: donor.budgetName,
            amount: formatCurrency(donor.spare)
          })
        )
        return
      }
    }
    if (pulledCents(pulls, donors) !== toCents(needed)) {
      setFormError(
        t('transactions.coverMustMatch', {
          amount: formatCurrency(needed)
        })
      )
      return
    }

    closeDialog(
      Object.fromEntries(
        donors
          .filter((donor) => toCents(pulls[donor.budgetId]) > 0)
          .map((donor) => [
            donor.budgetId,
            pulls[donor.budgetId] as number
          ])
      )
    )
  }, [
    closeDialog,
    donors,
    needed,
    pulls,
    t
  ])

  const dialog = useMemo(
    () => (
      <AlertDialog
        open={Boolean(request)}
        onOpenChange={(open) => {
          if (!open) closeDialog(null)
        }}
      >
        <AlertDialogContent className="flex max-h-[min(90vh,720px)] flex-col gap-4 overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('transactions.coverTitle')}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-3">
                <p>{t('transactions.coverIntro')}</p>
                <ul className="flex list-disc flex-col gap-1 pl-5">
                  {shortfalls.map((item) => (
                    <li key={item.budgetId}>
                      {t('transactions.coverShortfallLine', {
                        budgetName: item.budgetName,
                        shortfall: formatCurrency(item.shortfall)
                      })}
                    </li>
                  ))}
                </ul>
                {(request?.poolAvailable ?? 0) > 0 ? (
                  <p>
                    {t('transactions.coverFromPool', {
                      amount: formatCurrency(request?.poolAvailable ?? 0)
                    })}
                  </p>
                ) : null}
                <p className="type-label text-black">
                  {t('transactions.coverLeftToCover', {
                    amount: formatCurrency(leftToCoverCents / 100)
                  })}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          {donors.length > 0 ? (
            <div className="grid grid-cols-[minmax(0,1fr)_9.5rem] items-center gap-x-4 gap-y-3">
              <span className="type-label text-gray-800">
                {t('transactions.coverDonorsColumn')}
              </span>
              <span className="type-label text-gray-800">
                {t('transactions.coverMoveColumn')}
              </span>
              {donors.map((donor) => (
                <DonorRow
                  key={donor.budgetId}
                  donor={donor}
                  value={pulls[donor.budgetId] ?? null}
                  onChange={(next) => {
                    setFormError(null)
                    setPulls((current) => ({
                      ...current,
                      [donor.budgetId]: next
                    }))
                  }}
                />
              ))}
            </div>
          ) : null}

          {canCover ? null : (
            <p className="type-body-medium text-red-700">
              {donors.length > 0
                ? t('transactions.coverNotEnough', {
                    amount: formatCurrency(totalSpareCents / 100)
                  })
                : t('transactions.coverNoDonors')}
            </p>
          )}
          {formError ? (
            <p className="type-body-medium text-red-700">{formError}</p>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <Button
              type="button"
              variant="filled"
              color="primary"
              label={request?.confirmLabel ?? t('common.confirm')}
              disabled={!canCover}
              onClick={handleConfirm}
            />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    ),
    [
      canCover,
      closeDialog,
      donors,
      formError,
      handleConfirm,
      leftToCoverCents,
      pulls,
      request,
      shortfalls,
      t,
      totalSpareCents
    ]
  )

  return {
    promptBudgetPulls,
    budgetCoverDialog: dialog
  }
}

const NO_DONORS: BudgetCoverDonor[] = []
const NO_SHORTFALLS: Parameters<PromptBudgetPulls>[0]['shortfalls'] = []

function DonorRow({
  donor,
  value,
  onChange
}: {
  donor: BudgetCoverDonor
  value: number | null
  onChange: (value: number | null) => void
}) {
  const { t } = useTranslation()
  const fieldId = useId()

  return (
    <>
      <label
        htmlFor={fieldId}
        className="type-body-medium text-gray-950"
      >
        {t('transactions.coverDonorLine', {
          budgetName: donor.budgetName,
          amount: formatCurrency(donor.spare)
        })}
      </label>
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
          max={donor.spare}
          value={value == null || Number.isNaN(value) ? '' : value}
          onChange={(event) => {
            if (event.target.value === '') {
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
