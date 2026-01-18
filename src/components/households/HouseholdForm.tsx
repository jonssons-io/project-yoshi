/**
 * Household Form Component
 * Used for creating and editing households
 */

import { useAppForm } from '@/hooks/form'
import { z } from 'zod'

const householdSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
})

type HouseholdFormData = z.infer<typeof householdSchema>

interface HouseholdFormProps {
  defaultValues?: Partial<HouseholdFormData>
  onSubmit: (data: HouseholdFormData) => Promise<void> | void
  onCancel?: () => void
  submitLabel?: string
}

export function HouseholdForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
}: HouseholdFormProps) {
  const form = useAppForm({
    defaultValues: {
      name: defaultValues?.name ?? '',
    },
    onSubmit: async ({ value }) => {
      // Validate with Zod
      const result = householdSchema.safeParse(value)
      if (!result.success) {
        console.error('Validation failed:', result.error)
        return
      }

      // Call the parent's onSubmit with validated data
      await onSubmit(result.data)
    },
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
            onChange: ({ value }) => {
              const result = householdSchema.shape.name.safeParse(value)
              return result.success ? undefined : result.error.issues[0]?.message
            },
          }}
        >
          {(field) => (
            <field.TextField
              label="Household Name"
              placeholder="e.g., Smith Family, Roommates"
            />
          )}
        </form.AppField>

        <div className="flex gap-2 justify-end">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <form.AppForm>
            <form.SubmitButton>{submitLabel}</form.SubmitButton>
          </form.AppForm>
        </div>
      </div>
    </form>
  )
}
