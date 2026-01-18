/**
 * TransactionForm - Form for creating and editing transactions
 */

import { useAppForm, createZodValidator, validateForm } from '@/components/form'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { z } from 'zod'
import { RecurrenceType } from '@/generated/prisma/enums'
import { useState } from 'react'

const transactionSchema = z.object({
  name: z.string().min(1, { message: 'Transaction name is required' }),
  amount: z.number().positive({ message: 'Amount must be positive' }),
  date: z.date({ message: 'Date is required' }),
  categoryId: z.string().min(1, { message: 'Category is required' }),
  accountId: z.string().min(1, { message: 'Account is required' }),
  notes: z.string().optional(),
  billId: z.string().optional().nullable(),
})

type TransactionFormData = z.infer<typeof transactionSchema>

export interface BillCreationData {
  recipient: string
  startDate: Date
  recurrenceType: RecurrenceType
  customIntervalDays?: number
  lastPaymentDate?: Date | null
}

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
   * Available bills (for linking)
   */
  bills?: Array<{ id: string; name: string; recipient: string }>

  /**
   * Pre-selected bill (from "Create Transaction" button on bills page)
   */
  preSelectedBillId?: string

  /**
   * Callback when form is submitted successfully
   */
  onSubmit: (data: TransactionFormData, billData?: BillCreationData) => Promise<void> | void

  /**
   * Callback when form is cancelled
   */
  onCancel?: () => void

  /**
   * Submit button text
   */
  submitLabel?: string

  /**
   * Is this for editing an existing transaction?
   */
  isEditing?: boolean
}

const recurrenceOptions = [
  { value: RecurrenceType.NONE, label: 'No recurrence (one-time)' },
  { value: RecurrenceType.WEEKLY, label: 'Weekly' },
  { value: RecurrenceType.MONTHLY, label: 'Monthly' },
  { value: RecurrenceType.QUARTERLY, label: 'Quarterly (every 3 months)' },
  { value: RecurrenceType.YEARLY, label: 'Yearly' },
  { value: RecurrenceType.CUSTOM, label: 'Custom interval' },
]

export function TransactionForm({
  defaultValues,
  categories,
  accounts,
  bills = [],
  preSelectedBillId,
  onSubmit,
  onCancel,
  submitLabel = 'Save Transaction',
  isEditing = false,
}: TransactionFormProps) {
  const [createBill, setCreateBill] = useState(false)
  const [billRecipient, setBillRecipient] = useState('')
  const [billStartDate, setBillStartDate] = useState<Date>(new Date())
  const [billRecurrence, setBillRecurrence] = useState<RecurrenceType>(RecurrenceType.MONTHLY)
  const [billCustomDays, setBillCustomDays] = useState<number | undefined>(undefined)
  const [billLastPayment, setBillLastPayment] = useState<Date | null>(null)

  const form = useAppForm({
    defaultValues: {
      name: defaultValues?.name ?? '',
      amount: defaultValues?.amount ?? 0,
      date: defaultValues?.date ?? new Date(),
      categoryId: defaultValues?.categoryId ?? '',
      accountId: defaultValues?.accountId ?? '',
      notes: defaultValues?.notes ?? '',
      billId: preSelectedBillId ?? defaultValues?.billId ?? null,
    },
    onSubmit: async ({ value }) => {
      const data = validateForm(transactionSchema, value)

      const billData = createBill
        ? {
            recipient: billRecipient,
            startDate: billStartDate,
            recurrenceType: billRecurrence,
            customIntervalDays: billCustomDays,
            lastPaymentDate: billLastPayment,
          }
        : undefined

      await onSubmit(data, billData)
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
          <field.TextField label="Transaction Name" placeholder="e.g., Grocery shopping, Salary payment" />
        )}
      </form.AppField>

      <form.AppField
        name="amount"
        validators={{
          onChange: createZodValidator(transactionSchema.shape.amount),
        }}
      >
        {(field) => (
          <field.NumberField label="Amount" placeholder="0.00" step="0.01" min={0} />
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
        {(field) => <field.TextField label="Notes (Optional)" placeholder="Additional details..." />}
      </form.AppField>

      {/* Bill Selection/Creation */}
      {!isEditing && (
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="createBill" checked={createBill} onCheckedChange={(checked) => setCreateBill(checked as boolean)} />
            <Label htmlFor="createBill" className="cursor-pointer">
              Create Bill for this transaction
            </Label>
          </div>

          {!createBill && bills.length > 0 && (
            <form.AppField
              name="billId"
              validators={{
                onChange: createZodValidator(transactionSchema.shape.billId),
              }}
            >
              {(field) => (
                <field.SelectField
                  label="Link to Bill (Optional)"
                  placeholder="Select a bill"
                  options={[
                    { value: '', label: 'No bill' },
                    ...bills.map((bill) => ({
                      value: bill.id,
                      label: `${bill.name} - ${bill.recipient}`,
                    })),
                  ]}
                />
              )}
            </form.AppField>
          )}

          {createBill && (
            <div className="space-y-4 bg-muted p-4 rounded-lg">
              <h4 className="font-semibold text-sm">Bill Details</h4>

              <div className="space-y-2">
                <Label>Recipient</Label>
                <input
                  type="text"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={billRecipient}
                  onChange={(e) => setBillRecipient(e.target.value)}
                  placeholder="e.g., Tibber, Netflix"
                />
              </div>

              <div className="space-y-2">
                <Label>Start Date (First Payment)</Label>
                <input
                  type="date"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={billStartDate.toISOString().split('T')[0]}
                  onChange={(e) => setBillStartDate(new Date(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label>Recurrence</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={billRecurrence}
                  onChange={(e) => setBillRecurrence(e.target.value as RecurrenceType)}
                >
                  {recurrenceOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {billRecurrence === RecurrenceType.CUSTOM && (
                <div className="space-y-2">
                  <Label>Days Between Payments</Label>
                  <input
                    type="number"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={billCustomDays ?? ''}
                    onChange={(e) => setBillCustomDays(Number(e.target.value) || undefined)}
                    placeholder="e.g., 30"
                    min={1}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Last Payment Date (Optional)</Label>
                <input
                  type="date"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={billLastPayment?.toISOString().split('T')[0] ?? ''}
                  onChange={(e) => setBillLastPayment(e.target.value ? new Date(e.target.value) : null)}
                />
                <p className="text-xs text-muted-foreground">For bills that will end (e.g., loan payoff date)</p>
              </div>
            </div>
          )}
        </div>
      )}

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
