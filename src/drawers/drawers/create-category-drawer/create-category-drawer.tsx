import { Check, LayoutGrid } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { CategoryType } from '@/api/generated/types.gen'
import { Button } from '@/components/button/button'
import {
  createTranslatedZodValidator,
  safeValidateForm,
  useAppForm
} from '@/components/form'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/auth-context'
import { useBudgetsList, useCreateCategory } from '@/hooks/api'
import { getErrorMessage } from '@/lib/api-error'
import { translateIfLikelyI18nKey } from '@/lib/form-validation'

export type CreateCategoryDrawerProps = {
  onClose: () => void
}

const createCategoryBaseSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(1, t('validation.categoryNameRequired')),
    types: z
      .array(
        z.enum([
          'INCOME',
          'EXPENSE'
        ])
      )
      .min(1, t('validation.categoryTypeRequired')),
    budgetIds: z.array(z.string())
  })

function mapFormTypesToApi(types: ('INCOME' | 'EXPENSE')[]): CategoryType[] {
  const out: CategoryType[] = []
  if (types.includes('INCOME')) out.push(CategoryType.INCOME)
  if (types.includes('EXPENSE')) out.push(CategoryType.EXPENSE)
  return out
}

export function CreateCategoryDrawer({ onClose }: CreateCategoryDrawerProps) {
  const { t } = useTranslation()
  const { userId, householdId } = useAuth()
  const incomeCheckboxId = useId()
  const expenseCheckboxId = useId()
  const budgetIdsInitRef = useRef(false)

  const { data: budgets = [] } = useBudgetsList({
    householdId,
    userId,
    enabled: Boolean(householdId)
  })

  const { mutateAsync: createCategoryAsync } = useCreateCategory()

  const budgetOptions = useMemo(
    () =>
      budgets.map((b) => ({
        value: b.id,
        label: b.name
      })),
    [
      budgets
    ]
  )

  const categorySchema = useMemo(() => {
    const base = createCategoryBaseSchema(t)
    return base.superRefine((data, ctx) => {
      if (budgetOptions.length > 0 && data.budgetIds.length === 0) {
        ctx.addIssue({
          code: 'custom',
          message: t('categories.drawerSelectAtLeastOneBudget'),
          path: [
            'budgetIds'
          ]
        })
      }
    })
  }, [
    t,
    budgetOptions.length
  ])

  const nameValidator = useMemo(
    () =>
      createTranslatedZodValidator(createCategoryBaseSchema(t).shape.name, t),
    [
      t
    ]
  )

  const [selectedTypes, setSelectedTypes] = useState<('INCOME' | 'EXPENSE')[]>([
    'EXPENSE'
  ])

  const form = useAppForm({
    defaultValues: {
      name: '',
      budgetIds: [] as string[]
    },
    canSubmitWhenInvalid: true,
    onSubmit: async ({ value }) => {
      const result = safeValidateForm(categorySchema, {
        ...value,
        types: selectedTypes
      })
      if (!result.success) {
        const msg = result.errors[0]?.message ?? 'common.error'
        toast.error(translateIfLikelyI18nKey(msg, t))
        return
      }

      if (!householdId) {
        toast.error(t('server.badRequest.missingHouseholdId'))
        return
      }

      try {
        await createCategoryAsync({
          householdId,
          userId,
          name: result.data.name,
          types: mapFormTypesToApi(result.data.types),
          ...(result.data.budgetIds.length > 0
            ? {
                budgetIds: result.data.budgetIds
              }
            : {})
        })
        toast.success(t('categories.createSuccess'))
        onClose()
      } catch (err) {
        toast.error(getErrorMessage(err))
      }
    }
  })

  useEffect(() => {
    if (budgetIdsInitRef.current || budgets.length === 0) return
    form.setFieldValue(
      'budgetIds',
      budgets.map((b) => b.id)
    )
    budgetIdsInitRef.current = true
  }, [
    budgets,
    form
  ])

  const toggleType = (type: 'INCOME' | 'EXPENSE') => {
    setSelectedTypes((prev) => {
      const active = prev.includes(type)
      if (active) {
        return prev.filter((x) => x !== type)
      }
      return [
        ...prev,
        type
      ]
    })
  }

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
        <form.AppField
          name="name"
          validators={{
            onSubmit: nameValidator
          }}
        >
          {(field) => (
            <field.TextField
              label={t('forms.categoryName')}
              placeholder={t('forms.categoryNamePlaceholder')}
              prependIcon={LayoutGrid}
            />
          )}
        </form.AppField>

        {budgetOptions.length > 0 ? (
          <form.AppField name="budgetIds">
            {(field) => (
              <field.MultiselectField
                label={t('categories.drawerBudgetAvailability')}
                placeholder={t('common.selectAnOption')}
                searchPlaceholder={t('forms.searchPlaceholder')}
                emptyText={t('accounts.drawerNoBudgets')}
                options={budgetOptions}
              />
            )}
          </form.AppField>
        ) : null}

        <div className="space-y-3">
          <Label>{t('categories.type')}</Label>
          <p className="text-sm text-muted-foreground">
            {t('categories.selectCategoryType')}
          </p>
          <div className="flex gap-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={incomeCheckboxId}
                checked={selectedTypes.includes('INCOME')}
                onCheckedChange={() => toggleType('INCOME')}
              />
              <Label
                htmlFor={incomeCheckboxId}
                className="font-normal cursor-pointer"
              >
                {t('categories.income')}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id={expenseCheckboxId}
                checked={selectedTypes.includes('EXPENSE')}
                onCheckedChange={() => toggleType('EXPENSE')}
              />
              <Label
                htmlFor={expenseCheckboxId}
                className="font-normal cursor-pointer"
              >
                {t('categories.expense')}
              </Label>
            </div>
          </div>
          {selectedTypes.length === 0 && (
            <p className="text-sm text-destructive">
              {t('categories.atleastOneTypeRequired')}
            </p>
          )}
        </div>
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
              icon={<Check aria-hidden={true} />}
              label={t('categories.createAction')}
              disabled={isSubmitting}
              onClick={() => void 0}
            />
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}
