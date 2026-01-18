/**
 * AccountForm - Form for creating and editing accounts
 */

import { useAppForm, createZodValidator, validateForm } from '@/components/form'
import { Button } from '@/components/ui/button'
import { z } from 'zod'

const accountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  externalIdentifier: z.string().optional(),
  initialBalance: z.number().default(0),
})

type AccountFormData = z.infer<typeof accountSchema>

export interface AccountFormProps {
  /**
   * Initial values for editing an existing account
   */
  defaultValues?: Partial<AccountFormData>

  /**
   * Callback when form is submitted successfully
   */
  onSubmit: (data: AccountFormData) => Promise<void> | void

  /**
   * Callback when form is cancelled
   */
  onCancel?: () => void

  /**
   * Submit button text
   */
  submitLabel?: string
}

export function AccountForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = 'Save Account',
}: AccountFormProps) {
  const form = useAppForm({
    defaultValues: {
      name: defaultValues?.name ?? '',
      externalIdentifier: defaultValues?.externalIdentifier ?? '',
      initialBalance: defaultValues?.initialBalance ?? 0,
    },
    onSubmit: async ({ value }) => {
      const data = validateForm(accountSchema, value)
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
          onChange: createZodValidator(accountSchema.shape.name),
        }}
      >
        {(field) => (
          <field.TextField
            label="Account Name"
            placeholder="e.g., Checking Account, Savings"
          />
        )}
      </form.AppField>

      <form.AppField
        name="externalIdentifier"
        validators={{
          onChange: createZodValidator(accountSchema.shape.externalIdentifier),
        }}
      >
        {(field) => (
          <field.TextField
            label="External Identifier (Optional)"
            description="Account number or external reference"
            placeholder="e.g., ****1234"
          />
        )}
      </form.AppField>

      <form.AppField
        name="initialBalance"
        validators={{
          onChange: createZodValidator(accountSchema.shape.initialBalance),
        }}
      >
        {(field) => (
          <field.NumberField
            label="Initial Balance"
            placeholder="0.00"
            step="0.01"
            min={0}
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
