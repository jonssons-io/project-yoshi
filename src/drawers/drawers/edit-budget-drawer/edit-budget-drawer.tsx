import { Check, NotebookPen } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { CategoryType, TransactionType } from '@/api/generated/types.gen'
import { Alert } from '@/components/alert'
import { Button } from '@/components/button/button'
import { createTranslatedZodValidator, useAppForm } from '@/components/form'
import { useAuth } from '@/contexts/auth-context'
import {
  useBudgetById,
  useCategoriesList,
  useLinkBudgetCategory,
  useUnlinkBudgetCategory,
  useUpdateBudget
} from '@/hooks/api'
import { getErrorMessage } from '@/lib/api-error'
import {
  safeValidateForm,
  translateIfLikelyI18nKey
} from '@/lib/form-validation'
import { formatCurrency } from '@/lib/utils'

export type EditBudgetDrawerProps = {
  id: string
  onClose: () => void
}

const DEFAULT_VALUES = {
  name: '',
  categoryIds: [] as string[]
}

export function EditBudgetDrawer({ id, onClose }: EditBudgetDrawerProps) {
  const { t } = useTranslation()
  const { userId, householdId } = useAuth()
  const [hasInitializedForm, setHasInitializedForm] = useState(false)

  const { data: budget, isPending: isBudgetPending } = useBudgetById({
    budgetId: id,
    userId,
    enabled: Boolean(id)
  })

  const { data: categories = [], isPending: isCategoriesPending } =
    useCategoriesList({
      householdId,
      userId,
      type: TransactionType.EXPENSE,
      enabled: Boolean(householdId)
    })

  const { data: linkedCategories, isPending: isLinkedCategoriesPending } =
    useCategoriesList({
      householdId,
      userId,
      budgetId: id,
      type: TransactionType.EXPENSE,
      enabled: Boolean(householdId && id)
    })

  const { mutateAsync: updateBudgetAsync } = useUpdateBudget()
  const { mutateAsync: linkBudgetCategoryAsync } = useLinkBudgetCategory()
  const { mutateAsync: unlinkBudgetCategoryAsync } = useUnlinkBudgetCategory()

  const categoryOptions = useMemo(
    () =>
      categories
        .filter(
          (category) =>
            !category.archived && category.types.includes(CategoryType.EXPENSE)
        )
        .map((category) => ({
          value: category.id,
          label: category.name
        })),
    [
      categories
    ]
  )

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, 'validation.budgetNameRequired'),
        categoryIds: z.array(z.string())
      }),
    []
  )

  const nameValidator = useMemo(
    () => createTranslatedZodValidator(schema.shape.name, t),
    [
      schema.shape.name,
      t
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

      if (!budget) {
        toast.error(t('budgets.notFound'))
        return
      }

      try {
        await updateBudgetAsync({
          id: budget.id,
          userId,
          name: parsed.data.name
        })

        const currentCategoryIds = new Set(
          (linkedCategories ?? []).map((category) => category.id)
        )
        const nextCategoryIds = new Set(parsed.data.categoryIds)

        const categoryIdsToLink = parsed.data.categoryIds.filter(
          (categoryId) => !currentCategoryIds.has(categoryId)
        )
        const categoryIdsToUnlink = [
          ...currentCategoryIds
        ].filter((categoryId) => !nextCategoryIds.has(categoryId))

        await Promise.all([
          ...categoryIdsToLink.map((categoryId) =>
            linkBudgetCategoryAsync({
              budgetId: budget.id,
              categoryId,
              userId
            })
          ),
          ...categoryIdsToUnlink.map((categoryId) =>
            unlinkBudgetCategoryAsync({
              budgetId: budget.id,
              categoryId,
              userId
            })
          )
        ])

        toast.success(t('budgets.updateSuccess'))
        onClose()
      } catch (err) {
        toast.error(getErrorMessage(err))
      }
    }
  })

  useEffect(() => {
    if (!budget || isLinkedCategoriesPending || hasInitializedForm) return

    form.setFieldValue('name', budget.name)
    form.setFieldValue(
      'categoryIds',
      (linkedCategories ?? []).map((category) => category.id)
    )
    setHasInitializedForm(true)
  }, [
    budget,
    linkedCategories,
    isLinkedCategoriesPending,
    form,
    hasInitializedForm
  ])

  if (
    !hasInitializedForm &&
    (isBudgetPending || isCategoriesPending || isLinkedCategoriesPending)
  ) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="type-body text-gray-800">{t('common.loading')}</p>
      </div>
    )
  }

  if (!budget) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="type-body text-gray-800">{t('budgets.notFound')}</p>
      </div>
    )
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
        <Alert variant="info">
          {t('budgets.editDrawerAllocatedNotice', {
            amount: formatCurrency(budget.allocatedAmount ?? 0)
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

        <form.AppField name="categoryIds">
          {(field) => (
            <field.MultiselectField
              label={t('budgets.drawerAvailableCategories')}
              placeholder={t('budgets.drawerCategoriesPlaceholder')}
              searchPlaceholder={t('forms.searchPlaceholder')}
              emptyText={t('forms.noCategories')}
              options={categoryOptions}
            />
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
              icon={<Check aria-hidden={true} />}
              label={t('budgets.edit')}
              disabled={isSubmitting}
              onClick={() => void 0}
            />
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}
