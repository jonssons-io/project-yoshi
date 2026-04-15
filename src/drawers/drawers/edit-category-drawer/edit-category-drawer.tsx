import { Check } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { CategoryType } from '@/api/generated/types.gen'
import { Button } from '@/components/button/button'
import {
  createZodValidator,
  safeValidateForm,
  useAppForm
} from '@/components/form'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/auth-context'
import {
  useBudgetsList,
  useCategoriesByBudgetMap,
  useCategoryById,
  useUpdateCategory
} from '@/hooks/api'
import { getErrorMessage } from '@/lib/api-error'

export type EditCategoryDrawerProps = {
  categoryId: string
  onClose: () => void
}

const createCategorySchema = (t: (key: string) => string) =>
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
    /** Registered field — must stay in form state so PATCH includes `budgetIds`. */
    budgetIds: z.array(z.string())
  })

function mapFormTypesToApi(types: ('INCOME' | 'EXPENSE')[]): CategoryType[] {
  const out: CategoryType[] = []
  if (types.includes('INCOME')) out.push(CategoryType.INCOME)
  if (types.includes('EXPENSE')) out.push(CategoryType.EXPENSE)
  return out
}

type CategoryFormDefaults = {
  name: string
  types: ('INCOME' | 'EXPENSE')[]
  budgetIds: string[]
}

type EditCategoryFormBodyProps = {
  categoryId: string
  userId: string | null
  defaultValues: CategoryFormDefaults
  budgets: Array<{
    id: string
    name: string
  }>
  onClose: () => void
}

function EditCategoryFormBody({
  categoryId,
  userId,
  defaultValues,
  budgets,
  onClose
}: EditCategoryFormBodyProps) {
  const { t } = useTranslation()
  const { mutateAsync: updateCategoryAsync } = useUpdateCategory()
  const categorySchema = useMemo(
    () => createCategorySchema(t),
    [
      t
    ]
  )
  const incomeCheckboxId = useId()
  const expenseCheckboxId = useId()

  const [selectedTypes, setSelectedTypes] = useState(defaultValues.types)

  const form = useAppForm({
    defaultValues: {
      name: defaultValues.name,
      types: defaultValues.types,
      budgetIds: defaultValues.budgetIds
    },
    canSubmitWhenInvalid: true,
    onSubmit: async ({ value }) => {
      const result = safeValidateForm(categorySchema, {
        ...value,
        types: selectedTypes
      })
      if (!result.success) {
        console.error('Category form validation failed', result.errors)
        return
      }

      try {
        await updateCategoryAsync({
          id: categoryId,
          userId,
          name: result.data.name,
          types: mapFormTypesToApi(result.data.types),
          budgetIds: result.data.budgetIds
        })
        toast.success(t('categories.updateSuccess'))
        onClose()
      } catch (err) {
        toast.error(getErrorMessage(err))
      }
    }
  })

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
            onChange: createZodValidator(categorySchema.shape.name)
          }}
        >
          {(field) => (
            <field.TextField
              label={t('forms.categoryName')}
              placeholder={t('forms.categoryNamePlaceholder')}
            />
          )}
        </form.AppField>

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

        {budgets.length > 0 && (
          <div className="pt-2">
            <form.AppField name="budgetIds">
              {(field) => (
                <field.CheckboxGroupField
                  label={t('categories.linkToBudgets')}
                  description={t('categories.selectBudgets')}
                  options={budgets.map((b) => ({
                    value: b.id,
                    label: b.name
                  }))}
                />
              )}
            </form.AppField>
          </div>
        )}
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
              label={t('categories.update')}
              disabled={isSubmitting}
              onClick={() => void 0}
            />
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}

export function EditCategoryDrawer({
  categoryId,
  onClose
}: EditCategoryDrawerProps) {
  const { userId, householdId } = useAuth()
  const { t } = useTranslation()

  const { data: category, isPending: categoryPending } = useCategoryById({
    categoryId,
    userId,
    enabled: Boolean(categoryId)
  })

  const { data: budgets = [], isPending: budgetsPending } = useBudgetsList({
    householdId,
    userId,
    enabled: Boolean(householdId)
  })

  const budgetIds = useMemo(
    () => budgets.map((b) => b.id),
    [
      budgets
    ]
  )

  const categoriesByBudget = useCategoriesByBudgetMap({
    householdId,
    budgetIds,
    enabled: Boolean(householdId) && budgetIds.length > 0
  })

  const linkedBudgetIds = useMemo(() => {
    if (!category) return []
    const ids: string[] = []
    for (const b of budgets) {
      const cats = categoriesByBudget.byBudgetId.get(b.id) ?? []
      if (cats.some((c) => c.id === category.id)) {
        ids.push(b.id)
      }
    }
    return ids
  }, [
    category,
    budgets,
    categoriesByBudget.byBudgetId
  ])

  const budgetOptions = useMemo(
    () =>
      budgets.map((b) => ({
        id: b.id,
        name: b.name
      })),
    [
      budgets
    ]
  )

  const defaultValues = useMemo(() => {
    if (!category) return undefined
    const types: ('INCOME' | 'EXPENSE')[] = []
    if (category.types.includes(CategoryType.INCOME)) types.push('INCOME')
    if (category.types.includes(CategoryType.EXPENSE)) types.push('EXPENSE')
    return {
      name: category.name,
      types:
        types.length > 0
          ? types
          : ([
              'EXPENSE'
            ] as ('INCOME' | 'EXPENSE')[]),
      budgetIds: linkedBudgetIds
    }
  }, [
    category,
    linkedBudgetIds
  ])

  const pageLoading =
    categoryPending ||
    budgetsPending ||
    (budgetIds.length > 0 && categoriesByBudget.isLoading)

  if (pageLoading || !defaultValues) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="type-body text-gray-800">{t('common.loading')}</p>
      </div>
    )
  }

  if (!category) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="type-body text-gray-800">{t('categories.notFound')}</p>
      </div>
    )
  }

  return (
    <EditCategoryFormBody
      key={category.id}
      categoryId={categoryId}
      userId={userId}
      defaultValues={defaultValues}
      budgets={budgetOptions}
      onClose={onClose}
    />
  )
}
