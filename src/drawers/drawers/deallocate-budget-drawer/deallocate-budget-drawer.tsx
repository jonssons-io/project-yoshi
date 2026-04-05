import { Check } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/button/button'
import { useAppForm } from '@/components/form'
import { useAuth } from '@/contexts/auth-context'
import { useDeallocateAllocationMutation } from '@/hooks/api'
import { getErrorMessage } from '@/lib/api-error'
import {
  safeValidateForm,
  translateIfLikelyI18nKey
} from '@/lib/form-validation'

export type DeallocateBudgetDrawerProps = {
  budgetId: string
  budgetName: string
  currentAllocation: number
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
 * Move previously allocated funds back to the household's unallocated pool.
 */
export function DeallocateBudgetDrawer({
  budgetId,
  currentAllocation,
  onClose
}: DeallocateBudgetDrawerProps) {
  const { t } = useTranslation()
  const { userId } = useAuth()

  const { mutateAsync: deallocateAsync, isPending } =
    useDeallocateAllocationMutation()

  const schema = useMemo(
    () =>
      z.object({
        amount: z
          .number()
          .positive('validation.positive')
          .max(currentAllocation, 'allocation.exceedsCurrentAllocation')
      }),
    [
      currentAllocation
    ]
  )

  const amountValidator = useMemo(
    () =>
      ({ value }: { value: unknown }) => {
        const amount = value as number

        if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) {
          return t('validation.positive')
        }

        if (amount > currentAllocation) {
          return t('allocation.exceedsCurrentAllocation')
        }

        return undefined
      },
    [
      currentAllocation,
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
        await deallocateAsync({
          budgetId,
          amount: parsed.data.amount * -1,
          userId
        })

        toast.success(t('allocation.deallocateSuccess'))
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
              max={currentAllocation}
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
                  Math.max(0, currentAllocation - (amount ?? 0)),
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
              label={t('allocation.drawer.removeFromBudget')}
              disabled={isSubmitting || isPending}
              onClick={() => void 0}
            />
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}
