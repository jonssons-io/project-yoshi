import { Check } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/button/button'
import { createTranslatedZodValidator, useAppForm } from '@/components/form'
import { useAuth } from '@/contexts/auth-context'
import { useTransferAllocationMutation } from '@/hooks/api'
import { getErrorMessage } from '@/lib/api-error'
import {
  safeValidateForm,
  translateIfLikelyI18nKey
} from '@/lib/form-validation'

type BudgetOption = {
  id: string
  name: string
  allocatedAmount: number
}

export type TransferBudgetAllocationDrawerProps = {
  budgets: BudgetOption[]
  initialFromBudgetId: string
  onClose: () => void
}

const DEFAULT_VALUES = {
  fromBudgetId: '',
  toBudgetId: '',
  amount: 0
}

/**
 * Transfer allocated funds from one budget to another.
 */
export function TransferBudgetAllocationDrawer({
  budgets,
  initialFromBudgetId,
  onClose
}: TransferBudgetAllocationDrawerProps) {
  const { t } = useTranslation()
  const { userId } = useAuth()

  const allocationByBudgetId = useMemo(
    () =>
      new Map(
        budgets.map((budget) => [
          budget.id,
          budget.allocatedAmount ?? 0
        ])
      ),
    [
      budgets
    ]
  )

  const { mutateAsync: transferAsync, isPending } =
    useTransferAllocationMutation()

  const schema = useMemo(
    () =>
      z
        .object({
          fromBudgetId: z.string().min(1, 'validation.required'),
          toBudgetId: z.string().min(1, 'validation.required'),
          amount: z.number().positive('validation.positive')
        })
        .superRefine((data, context) => {
          if (data.fromBudgetId === data.toBudgetId) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'allocation.transferDrawer.sameBudgetError',
              path: [
                'toBudgetId'
              ]
            })
          }

          const sourceAllocation =
            allocationByBudgetId.get(data.fromBudgetId) ?? 0

          if (data.amount > sourceAllocation) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'allocation.exceedsSourceAllocation',
              path: [
                'amount'
              ]
            })
          }
        }),
    [
      allocationByBudgetId
    ]
  )

  const form = useAppForm({
    defaultValues: {
      ...DEFAULT_VALUES,
      fromBudgetId: initialFromBudgetId
    },
    canSubmitWhenInvalid: true,
    onSubmit: async ({ value }) => {
      const parsed = safeValidateForm(schema, value)

      if (!parsed.success) {
        const message = parsed.errors[0]?.message ?? 'common.error'
        toast.error(translateIfLikelyI18nKey(message, t))
        return
      }

      try {
        await transferAsync({
          fromBudgetId: parsed.data.fromBudgetId,
          toBudgetId: parsed.data.toBudgetId,
          amount: parsed.data.amount,
          userId
        })

        toast.success(t('allocation.transferSuccess'))
        onClose()
      } catch (error) {
        toast.error(getErrorMessage(error))
      }
    }
  })

  const fromBudgetValidator = useMemo(
    () => createTranslatedZodValidator(schema.shape.fromBudgetId, t),
    [
      schema.shape.fromBudgetId,
      t
    ]
  )

  const toBudgetValidator = useMemo(
    () =>
      ({ value }: { value: unknown }) => {
        const toBudgetId = value as string
        const fromBudgetId = form.getFieldValue('fromBudgetId')

        if (!toBudgetId) {
          return t('validation.required')
        }

        if (toBudgetId === fromBudgetId) {
          return t('allocation.transferDrawer.sameBudgetError')
        }

        return undefined
      },
    [
      form,
      t
    ]
  )

  const amountValidator = useMemo(
    () =>
      ({ value }: { value: unknown }) => {
        const amount = value as number
        const sourceAllocation =
          allocationByBudgetId.get(form.getFieldValue('fromBudgetId')) ?? 0

        if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) {
          return t('validation.positive')
        }

        if (amount > sourceAllocation) {
          return t('allocation.exceedsSourceAllocation')
        }

        return undefined
      },
    [
      allocationByBudgetId,
      form,
      t
    ]
  )

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
        <form.Subscribe
          selector={(state) => ({
            fromBudgetId: state.values.fromBudgetId
          })}
        >
          {({ fromBudgetId }) => (
            <>
              <form.AppField
                name="fromBudgetId"
                validators={{
                  onSubmit: fromBudgetValidator
                }}
              >
                {(field) => (
                  <field.SelectField
                    label={t('allocation.transferDrawer.fromBudget')}
                    placeholder={t('allocation.transferDrawer.selectSource')}
                    options={budgets.map((budget) => ({
                      value: budget.id,
                      label: budget.name
                    }))}
                    onValueChange={(value) => {
                      if (form.getFieldValue('toBudgetId') === value) {
                        form.setFieldValue('toBudgetId', '')
                      }
                    }}
                  />
                )}
              </form.AppField>

              <form.AppField
                name="toBudgetId"
                validators={{
                  onSubmit: toBudgetValidator
                }}
              >
                {(field) => (
                  <field.SelectField
                    label={t('allocation.transferDrawer.toBudget')}
                    placeholder={t('allocation.transferDrawer.selectDest')}
                    options={budgets.map((budget) => ({
                      value: budget.id,
                      label: budget.name,
                      disabled: budget.id === fromBudgetId
                    }))}
                  />
                )}
              </form.AppField>

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
                    max={allocationByBudgetId.get(fromBudgetId)}
                    step={100}
                  />
                )}
              </form.AppField>
            </>
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
              label={t('allocation.transferDrawer.transfer')}
              disabled={isSubmitting || isPending}
              onClick={() => void 0}
            />
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}
