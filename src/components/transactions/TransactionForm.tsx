/**
 * TransactionForm - Form for creating and editing transactions
 */

import { useAppForm, createZodValidator, validateForm } from '@/components/form'
import { Button } from '@/components/ui/button'
import { z } from 'zod'

const transactionSchema = z.object({
  name: z.string().min(1, 'Transaction name is required'),
  amount: z.number().positive('Amount must be positive'),
  date: z.date({ message: 'Date is required' }),
  categoryId: z.string().min(1, 'Category is required'),
  accountId: z.string().min(1, 'Account is required'),
  notes: z.string().optional(),
})

type TransactionFormData = z.infer<typeof transactionSchema>

export interface TransactionFormProps {
  /**
   * Initial values for editing an existing transaction
   */
  defaultValues?: Partial<TransactionFormData>

  /**
   * Available categories
   */
  categories: Array<{ id: string; name: string; type: string }>

  /**
   * Available accounts
   */
  accounts: Array<{ id: string; name: string }>

  /**
   * Callback when form is submitted successfully
   */
  onSubmit: (data: TransactionFormData) => Promise<void> | void

  /**
   * Callback when form is cancelled
   */
  onCancel?: () => void

  /**
   * Submit button text
   */
  submitLabel?: string
}

export function TransactionForm({
  defaultValues,
  categories,
  accounts,
  onSubmit,
  onCancel,
  submitLabel = 'Save Transaction',
}: TransactionFormProps) {
  const form = useAppForm({
    defaultValues: {
      name: defaultValues?.name ?? '',
      amount: defaultValues?.amount ?? 0,
      date: defaultValues?.date ?? new Date(),
      categoryId: defaultValues?.categoryId ?? '',
      accountId: defaultValues?.accountId ?? '',
      notes: defaultValues?.notes ?? '',
    },
    onSubmit: async ({ value }) => {
      const data = validateForm(transactionSchema, value)
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
          onChange: createZodValidator(transactionSchema.shape.name),
        }}
      >
        {(field) => (
          <field.TextField
            label="Transaction Name"
            placeholder="e.g., Grocery shopping, Salary payment"
          />
        )}
      </form.AppField>

      <form.AppField
        name="amount"
        validators={{
          onChange: createZodValidator(transactionSchema.shape.amount),
        }}
      >
        {(field) => (
          <field.NumberField
            label="Amount"
            placeholder="0.00"
            step="0.01"
            min={0}
          />
        )}
      </form.AppField>

      <form.AppField
        name="date"
        validators={{
          onChange: createZodValidator(transactionSchema.shape.date),
        }}
      >
        {(field) => <field.DateField label="Date" />}
      </form.AppField>

      <form.AppField
        name="categoryId"
        validators={{
          onChange: createZodValidator(transactionSchema.shape.categoryId),
        }}
      >
        {(field) => (
          <field.SelectField
            label="Category"
            placeholder="Select a category"
            options={categories.map((cat) => ({
              value: cat.id,
              label: `${cat.name} (${cat.type})`,
            }))}
          />
        )}
      </form.AppField>

      <form.AppField
        name="accountId"
        validators={{
          onChange: createZodValidator(transactionSchema.shape.accountId),
        }}
      >
        {(field) => (
          <field.SelectField
            label="Account"
            placeholder="Select an account"
            options={accounts.map((acc) => ({
              value: acc.id,
              label: acc.name,
            }))}
          />
        )}
      </form.AppField>

      <form.AppField
        name="notes"
        validators={{
          onChange: createZodValidator(transactionSchema.shape.notes),
        }}
      >
        {(field) => (
          <field.TextField
            label="Notes (Optional)"
            placeholder="Additional details..."
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
