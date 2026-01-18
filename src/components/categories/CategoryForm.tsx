/**
 * CategoryForm - Form for creating and editing categories
 */

import { useAppForm, createZodValidator, validateForm } from '@/components/form'
import { Button } from '@/components/ui/button'
import { z } from 'zod'

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  type: z.enum(['INCOME', 'EXPENSE'], {
    message: 'Category type is required',
  }),
})

type CategoryFormData = z.infer<typeof categorySchema>

export interface CategoryFormProps {
  /**
   * Initial values for editing an existing category
   */
  defaultValues?: Partial<CategoryFormData>

  /**
   * Callback when form is submitted successfully
   */
  onSubmit: (data: CategoryFormData) => Promise<void> | void

  /**
   * Callback when form is cancelled
   */
  onCancel?: () => void

  /**
   * Submit button text
   */
  submitLabel?: string
}

export function CategoryForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = 'Save Category',
}: CategoryFormProps) {
  const form = useAppForm({
    defaultValues: {
      name: defaultValues?.name ?? '',
      type: (defaultValues?.type ?? 'EXPENSE') as 'INCOME' | 'EXPENSE',
    },
    onSubmit: async ({ value }) => {
      const data = validateForm(categorySchema, value)
      await onSubmit(data)
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
      className="space-y-4"
    >
      <form.AppField
        name="name"
        validators={{
          onChange: createZodValidator(categorySchema.shape.name),
        }}
      >
        {(field) => (
          <field.TextField
            label="Category Name"
            placeholder="e.g., Groceries, Salary, Utilities"
          />
        )}
      </form.AppField>

      <form.AppField
        name="type"
        validators={{
          onChange: createZodValidator(categorySchema.shape.type),
        }}
      >
        {(field) => (
          <field.SelectField
            label="Category Type"
            description="Is this an income or expense category?"
            options={[
              { value: 'INCOME', label: 'Income' },
              { value: 'EXPENSE', label: 'Expense' },
            ]}
          />
        )}
      </form.AppField>

      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <form.AppForm>
          <form.SubmitButton>{submitLabel}</form.SubmitButton>
        </form.AppForm>
      </div>
    </form>
  )
}
