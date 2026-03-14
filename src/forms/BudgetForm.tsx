/**
 * Budget Form Component
 * Used for creating and editing budgets
 */

import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { useAppForm } from '@/hooks/form'
import { createZodValidator, safeValidateForm } from '@/lib/form-validation'

const budgetSchema = z.object({
  name: z.string().min(1, {
    message: 'validation.budgetNameRequired'
  })
})

type BudgetFormData = z.infer<typeof budgetSchema>

export interface BudgetFormProps {
  defaultValues?: Partial<BudgetFormData>
  onSubmit: (data: BudgetFormData) => Promise<void> | void
  onCancel?: () => void
  onDelete?: () => void
  submitLabel?: string
}

export function BudgetForm({
  defaultValues,
  onSubmit,
  onCancel,
  onDelete,
  submitLabel = 'Save'
}: BudgetFormProps) {
  const { t } = useTranslation()
  const effectiveSubmitLabel = submitLabel ?? t('common.save')

  const form = useAppForm({
    defaultValues: {
      name: defaultValues?.name ?? ''
    },
    onSubmit: async ({ value }) => {
      const result = safeValidateForm(budgetSchema, value)
      if (!result.success) {
        console.error('Budget form validation failed', result.errors)
        return
      }
      await onSubmit(result.data)
    }
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
    >
      <div className="space-y-4">
        <form.AppField
          name="name"
          validators={{
            onChange: createZodValidator(budgetSchema.shape.name)
          }}
        >
          {(field) => (
            <field.TextField
              label={t('forms.budgetName')}
              placeholder={t('forms.budgetPlaceholder')}
            />
          )}
        </form.AppField>

        <form.AppForm>
          <form.FormButtonGroup
            onDelete={onDelete}
            onCancel={onCancel}
            submitLabel={effectiveSubmitLabel}
          />
        </form.AppForm>
      </div>
    </form>
  )
}
