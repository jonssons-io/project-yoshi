import { Check } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { Alert } from '@/components/alert'
import { Button } from '@/components/button/button'
import { useAppForm } from '@/components/form'
import { useAuth } from '@/contexts/auth-context'
import { useCreateAllocationMutation } from '@/hooks/api'
import { getErrorMessage } from '@/lib/api-error'
import {
  safeValidateForm,
  translateIfLikelyI18nKey
} from '@/lib/form-validation'

export type AllocateBudgetDrawerProps = {
  budgetId: string
  budgetName: string
  currentAllocation: number
  availableToAllocate: number
  onClose: () => void
}

const DEFAULT_VALUES = {
  amount: 0
}

const amountFormatter = new Intl.NumberFormat('sv-SE', {
  maximumFractionDigits: 2
})

function formatBudgetAmount(amount: number, currencyCode: string): string {
  return `${amountFormatter.format(amount)} ${currencyCode}`
}

/**
 * Allocate more funds from the household's unallocated pool into a budget.
 */
export function AllocateBudgetDrawer({
  budgetId,
  currentAllocation,
  availableToAllocate,
  onClose
}: AllocateBudgetDrawerProps) {
  const { t } = useTranslation()
  const { userId } = useAuth()

  const { mutateAsync: allocateAsync, isPending } =
    useCreateAllocationMutation()

  const schema = useMemo(
    () =>
      z.object({
        amount: z
          .number()
          .positive('validation.positive')
          .max(availableToAllocate, 'allocation.exceedsAvailable')
      }),
    [
      availableToAllocate
    ]
  )

  const amountValidator = useMemo(
    () =>
      ({ value }: { value: unknown }) => {
        const amount = value as number

        if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) {
          return t('validation.positive')
        }

        if (amount > availableToAllocate) {
          return t('allocation.exceedsAvailable')
        }

        return undefined
      },
    [
      availableToAllocate,
      t
    ]
  )

  const form = useAppForm({
    defaultValues: DEFAULT_VALUES,
    canSubmitWhenInvalid: true,
    onSubmit: async ({ value }) => {
      const parsed = safeValidateForm(schema, value)

      if (!parsed.success) {
        const message = parsed.errors[0]?.message ?? 'common.error'
        toast.error(translateIfLikelyI18nKey(message, t))
        return
      }

      try {
        await allocateAsync({
          budgetId,
          amount: parsed.data.amount,
          userId
        })

        toast.success(t('allocation.allocateSuccess'))
        onClose()
      } catch (error) {
        toast.error(getErrorMessage(error))
      }
    }
  })

  return (
    <form
      className="flex h-full min-h-0 flex-1 flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        <Alert variant="info">
          {t('allocation.drawer.availableToAllocate', {
            amount: formatBudgetAmount(
              availableToAllocate,
              t('common.currencyCode')
            )
          })}
        </Alert>

        <div className="flex flex-col gap-1">
          <span className="type-label text-gray-800">
            {t('allocation.drawer.currentBudget')}
          </span>
          <span className="type-body-medium text-black">
            {formatBudgetAmount(currentAllocation, t('common.currencyCode'))}
          </span>
        </div>

        <form.AppField
          name="amount"
          validators={{
            onSubmit: amountValidator
          }}
        >
          {(field) => (
            <field.NumberField
              label={t('common.amount')}
              unit={t('common.currencyCode')}
              min={0}
              max={availableToAllocate}
            />
          )}
        </form.AppField>

        <form.Subscribe selector={(state) => state.values.amount}>
          {(amount) => (
            <div className="flex flex-col gap-1">
              <span className="type-label text-gray-800">
                {t('allocation.drawer.newBudget')}
              </span>
              <span className="type-body-medium text-black">
                {formatBudgetAmount(
                  currentAllocation + (amount ?? 0),
                  t('common.currencyCode')
                )}
              </span>
            </div>
          )}
        </form.Subscribe>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-gray-200 pt-4">
        <Button
          type="button"
          variant="outlined"
          color="subtle"
          label={t('common.cancel')}
          onClick={onClose}
        />
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button
              type="submit"
              variant="filled"
              color="primary"
              icon={<Check aria-hidden={true} />}
              label={t('allocation.drawer.addToBudget')}
              disabled={isSubmitting || isPending}
              onClick={() => void 0}
            />
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}
