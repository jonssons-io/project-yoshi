import { NotebookPen, Plus } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { CategoryType, TransactionType } from '@/api/generated/types.gen'
import { Alert } from '@/components/alert'
import { Button } from '@/components/button/button'
import { createTranslatedZodValidator, useAppForm } from '@/components/form'
import { useAuth } from '@/contexts/auth-context'
import {
  useAllocationsQuery,
  useCategoriesList,
  useCreateAllocationMutation,
  useCreateBudget
} from '@/hooks/api'
import { getErrorMessage } from '@/lib/api-error'
import {
  safeValidateForm,
  translateIfLikelyI18nKey
} from '@/lib/form-validation'
import { formatCurrency } from '@/lib/utils'

export type CreateBudgetDrawerProps = {
  onClose: () => void
}

const DEFAULT_VALUES = {
  name: '',
  initialAmount: 0,
  categoryIds: [] as string[]
}

export function CreateBudgetDrawer({ onClose }: CreateBudgetDrawerProps) {
  const { t } = useTranslation()
  const { userId, householdId } = useAuth()

  const { data: allocationSummary } = useAllocationsQuery({
    householdId: householdId ?? '',
    userId: userId ?? '',
    enabled: Boolean(householdId && userId)
  })

  const unallocatedAmount = allocationSummary?.unallocated ?? 0

  const { mutateAsync: createBudgetAsync } = useCreateBudget()
  const { mutateAsync: createAllocationAsync } = useCreateAllocationMutation()

  const { data: categories = [] } = useCategoriesList({
    householdId,
    userId,
    type: TransactionType.EXPENSE,
    enabled: Boolean(householdId)
  })

  const categoryOptions = useMemo(
    () =>
      categories
        .filter((c) => !c.archived && c.types.includes(CategoryType.EXPENSE))
        .map((c) => ({
          value: c.id,
          label: c.name
        })),
    [
      categories
    ]
  )

  const schema = useMemo(
    () =>
      z
        .object({
          name: z.string().min(1, 'validation.budgetNameRequired'),
          initialAmount: z.number().min(0, 'budgets.drawerInitialBudgetMin'),
          categoryIds: z.array(z.string())
        })
        .superRefine((data, ctx) => {
          if (data.initialAmount > unallocatedAmount) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'budgets.drawerAmountExceedsAvailable',
              path: [
                'initialAmount'
              ]
            })
          }
        }),
    [
      unallocatedAmount
    ]
  )

  const nameValidator = useMemo(
    () => createTranslatedZodValidator(schema.shape.name, t),
    [
      schema.shape.name,
      t
    ]
  )

  const initialAmountValidator = useMemo(
    () =>
      ({ value }: { value: unknown }) => {
        const n = value as number
        if (typeof n !== 'number' || Number.isNaN(n) || n < 0) {
          return t('budgets.drawerInitialBudgetMin')
        }
        if (n > unallocatedAmount) {
          return t('budgets.drawerAmountExceedsAvailable')
        }
        return undefined
      },
    [
      t,
      unallocatedAmount
    ]
  )

  const form = useAppForm({
    defaultValues: DEFAULT_VALUES,
    canSubmitWhenInvalid: true,
    onSubmit: async ({ value }) => {
      const parsed = safeValidateForm(schema, value)
      if (!parsed.success) {
        const msg = parsed.errors[0]?.message ?? 'common.error'
        toast.error(translateIfLikelyI18nKey(msg, t))
        return
      }

      if (!householdId) {
        toast.error(t('server.badRequest.missingHouseholdId'))
        return
      }

      const data = parsed.data

      try {
        const budget = await createBudgetAsync({
          householdId,
          userId,
          name: data.name,
          categoryIds:
            data.categoryIds.length > 0 ? data.categoryIds : undefined
        })

        if (data.initialAmount > 0) {
          await createAllocationAsync({
            budgetId: budget.id,
            amount: data.initialAmount,
            userId
          })
        }

        toast.success(t('budgets.createSuccess'))
        onClose()
      } catch (err) {
        toast.error(getErrorMessage(err))
      }
    }
  })

  return (
    <form
      className="flex h-full min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        <Alert variant="info">
          {t('budgets.drawerAvailableToBudget', {
            amount: formatCurrency(unallocatedAmount)
          })}
        </Alert>
        <form.AppField
          name="name"
          validators={{
            onSubmit: nameValidator
          }}
        >
          {(field) => (
            <field.TextField
              label={t('forms.budgetName')}
              placeholder={t('forms.budgetPlaceholder')}
              prependIcon={NotebookPen}
            />
          )}
        </form.AppField>

        <form.AppField
          name="initialAmount"
          validators={{
            onSubmit: initialAmountValidator
          }}
        >
          {(field) => (
            <field.NumberField
              label={t('budgets.drawerInitialBudget')}
              unit={t('common.currencyCode')}
              min={0}
              step={100}
            />
          )}
        </form.AppField>

        <form.AppField name="categoryIds">
          {(field) => (
            <div className="flex flex-col gap-1">
              <field.MultiselectField
                label={t('budgets.drawerAvailableCategories')}
                placeholder={t('budgets.drawerCategoriesPlaceholder')}
                searchPlaceholder={t('forms.searchPlaceholder')}
                emptyText={t('forms.noCategories')}
                options={categoryOptions}
              />
              <p className="type-label text-gray-600">
                {t('budgets.drawerCategoriesHint')}
              </p>
            </div>
          )}
        </form.AppField>
      </div>

      <div className="mt-auto flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-gray-200 pt-4">
        <Button
          type="button"
          variant="outlined"
          color="subtle"
          label={t('common.cancel')}
          onClick={onClose}
        />
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <Button
              type="submit"
              variant="filled"
              color="primary"
              icon={<Plus aria-hidden />}
              label={t('budgets.drawerSubmit')}
              disabled={isSubmitting}
              onClick={() => void 0}
            />
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}
