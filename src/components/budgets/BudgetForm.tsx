/**
 * BudgetForm - Form for creating and editing budgets
 */

import { useAppForm, createZodValidator, validateForm } from '@/components/form'
import { Button } from '@/components/ui/button'
import { z } from 'zod'

const budgetSchema = z.object({
  name: z.string().min(1, 'Budget name is required'),
  startDate: z.date({
    error: 'Start date is required',
  }),
})

type BudgetFormData = z.infer<typeof budgetSchema>

export interface BudgetFormProps {
  /**
   * Initial values for editing an existing budget
   */
  defaultValues?: Partial<BudgetFormData>

  /**
   * Callback when form is submitted successfully
   */
  onSubmit: (data: BudgetFormData) => Promise<void> | void

  /**
   * Callback when form is cancelled
   */
  onCancel?: () => void

  /**
   * Submit button text
   */
  submitLabel?: string
}

export function BudgetForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = 'Save Budget',
}: BudgetFormProps) {
  const form = useAppForm({
    defaultValues: {
      name: defaultValues?.name ?? '',
      startDate: defaultValues?.startDate ?? new Date(),
    },
    onSubmit: async ({ value }) => {
      const data = validateForm(budgetSchema, value)
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
          onChange: createZodValidator(budgetSchema.shape.name),
        }}
      >
        {(field) => (
          <field.TextField
            label="Budget Name"
            placeholder="e.g., My Household Budget"
          />
        )}
      </form.AppField>

      <form.AppField
        name="startDate"
        validators={{
          onChange: createZodValidator(budgetSchema.shape.startDate),
        }}
      >
        {(field) => (
          <field.DateField
            label="Start Date"
            description="When does this budget period begin?"
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
