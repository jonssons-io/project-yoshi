/**
 * TransactionForm - Form for creating and editing transactions
 *
 * Features:
 * - Income/Expense type selector
 * - Category filtering based on transaction type
 * - Inline category creation via ComboboxField
 * - Split transaction support for expenses
 */

import { AlertTriangleIcon, Plus, Trash2 } from 'lucide-react'
import { type ReactNode, useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import type { Budget } from '@/api/generated/types.gen'
import {
  RecurrenceType,
  type RecurrenceType as RecurrenceTypeType,
  TransactionType
} from '@/api/generated/types.gen'
import {
  type ComboboxValue,
  createZodValidator,
  useAppForm,
  validateForm
} from '@/components/form'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useConfirmDialog } from '@/hooks/use-confirm-dialog'
import { normalizeBackendSplits } from '@/lib/split-normalization'

type BudgetWithDetails = Omit<Budget, 'startDate'> & {
  startDate: Date
}

// Schema with discriminated category field
const transactionSchema = z
  .object({
    name: z.string().min(1, {
      message: 'validation.nameRequired'
    }),
    amount: z.number().positive({
      message: 'validation.positive'
    }),
    date: z.date({
      message: 'validation.dateRequired'
    }),
    transactionType: z.enum([
      TransactionType.INCOME,
      TransactionType.EXPENSE,
      TransactionType.TRANSFER
    ]),
    // Category can be either an existing ID or a new category to create
    category: z
      .union([
        z.string().min(1, {
          message: 'validation.categoryRequired'
        }),
        z.object({
          isNew: z.literal(true),
          name: z.string().min(1, {
            message: 'validation.categoryNameRequired'
          })
        })
      ])
      .optional(), // Optional now because of splits
    accountId: z.string().min(1, {
      message: 'validation.accountRequired'
    }),
    // Recipient/Sender is optional - can be ID or new name
    recipient: z
      .union([
        z.string().min(1),
        z.object({
          isNew: z.literal(true),
          name: z.string().min(1)
        })
      ])
      .nullable()
      .optional(),
    notes: z.string().optional(),
    // billId uses "__none__" as sentinel for no selection (Select requires non-empty values)
    billId: z.string().optional().nullable(),
    budgetId: z.string().optional(),
    transferToAccountId: z.string().optional(),
    instanceId: z.string().optional().nullable(),
    // Splits
    splits: z
      .array(
        z.object({
          subtitle: z.string().min(1, 'validation.subtitleRequired'),
          amount: z.number().positive('validation.positive'),
          // Category logic same as before but per split
          category: z.union([
            z.string().min(1, {
              message: 'validation.categoryRequired'
            }),
            z.object({
              isNew: z.literal(true),
              name: z.string().min(1, {
                message: 'validation.categoryNameRequired'
              })
            })
          ])
        })
      )
      .optional()
  })
  .refine(
    (data) => {
      // If splits IS present and has length, category is optional at top level
      // If splits IS NOT present (or empty), category is required at top level
      if (data.transactionType === TransactionType.TRANSFER) {
        return (
          Boolean(data.transferToAccountId) &&
          data.transferToAccountId !== data.accountId
        )
      }
      if (
        data.transactionType === TransactionType.EXPENSE &&
        data.splits &&
        data.splits.length > 0
      ) {
        return true
      }
      if (data.category) return true
      return false
    },
    {
      message: 'validation.categoryRequired',
      path: [
        'category'
      ]
    }
  )
  .refine(
    (data) =>
      data.transactionType !== TransactionType.EXPENSE ||
      Boolean(data.budgetId),
    {
      message: 'validation.required',
      path: [
        'budgetId'
      ]
    }
  )

// Sentinel value for "no bill" selection (shadcn Select requires non-empty values)
const NO_BILL_VALUE = '__none__'

type TransactionFormData = z.infer<typeof transactionSchema>

export interface BillCreationData {
  recipient: string
  startDate: Date
  recurrenceType: RecurrenceTypeType
  customIntervalDays?: number
  lastPaymentDate?: Date | null
}

export interface TransactionFormProps {
  /**
   * Initial values for editing an existing transaction
   */
  defaultValues?: {
    name?: string
    amount?: number
    date?: Date
    categoryId?: string
    budgetId?: string
    accountId?: string
    transferToAccountId?: string
    instanceId?: string | null
    recipientId?: string | null
    recipient?: ComboboxValue | null // allow passing full object
    notes?: string
    billId?: string | null
    transactionType?: 'INCOME' | 'EXPENSE' | 'TRANSFER'
    splits?: Array<{
      subtitle: string
      amount: number
      categoryId: string
    }>
  }

  /**
   * Available categories (all types - will be filtered by form)
   */
  categories: Array<{
    id: string
    name: string
    types: string[]
  }>

  /**
   * Available accounts
   */
  accounts: Array<{
    id: string
    name: string
  }>

  /**
   * Available budgets for overdraft check
   */
  budgets?: BudgetWithDetails[]

  /**
   * Called when selected budget changes in the form
   */
  onBudgetChange?: (budgetId?: string) => void

  /**
   * Called when transaction type changes in the form.
   */
  onTransactionTypeChange?: (type: 'INCOME' | 'EXPENSE' | 'TRANSFER') => void

  /**
   * Available recipients (for both expense recipients and income senders)
   */
  recipients?: Array<{
    id: string
    name: string
  }>

  /**
   * Available bills (for linking)
   */
  bills?: Array<{
    id: string
    name: string
    recipient: string
  }>

  /**
   * Pre-selected bill (from "Create Transaction" button on bills page)
   */
  preSelectedBillId?: string

  /**
   * Callback when form is submitted successfully
   * @param data - Form data including category (ID or new object)
   * @param billData - Optional bill creation data
   */
  onSubmit: (
    data: TransactionFormData,
    billData?: BillCreationData
  ) => Promise<void> | void

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

  /**
   * Original bill amount for diff comparison
   */
  originalBillAmount?: number
}

type SplitFormValue = {
  subtitle?: string
  amount?: number
  category?: ComboboxValue
}

type SubscribeComponentProps<TSelected> = {
  selector: (state: {
    values: {
      splits?: SplitFormValue[]
      amount: number
      transactionType: string
      budgetId: string
    }
  }) => TSelected
  children: (value: TSelected) => ReactNode
}

type SubscribeComponent = <TSelected>(
  props: SubscribeComponentProps<TSelected>
) => ReactNode | Promise<ReactNode>

function AmountSyncLogic({
  splits,
  amount,
  type,
  useSplits,
  onAmountChange
}: {
  splits: SplitFormValue[] | undefined
  amount: number
  type: string
  useSplits: boolean
  onAmountChange: (value: number) => void
}) {
  useEffect(() => {
    if (type === TransactionType.EXPENSE && useSplits && splits) {
      const total = splits.reduce((sum, split) => sum + (split.amount || 0), 0)
      if (Math.abs(total - amount) > 0.001) {
        onAmountChange(Number(total.toFixed(2)))
      }
    }
  }, [
    amount,
    onAmountChange,
    splits,
    type,
    useSplits
  ])

  return null
}

function AmountSync({
  Subscribe,
  useSplits,
  onAmountChange
}: {
  Subscribe: SubscribeComponent
  useSplits: boolean
  onAmountChange: (value: number) => void
}) {
  return (
    <Subscribe
      selector={(state) => ({
        splits: state.values.splits,
        amount: state.values.amount,
        type: state.values.transactionType
      })}
    >
      {(values) => (
        <AmountSyncLogic
          splits={values.splits}
          amount={values.amount}
          type={values.type}
          useSplits={useSplits}
          onAmountChange={onAmountChange}
        />
      )}
    </Subscribe>
  )
}

function BudgetSyncLogic({
  budgetId,
  onBudgetChange
}: {
  budgetId: string
  onBudgetChange: (budgetId?: string) => void
}) {
  useEffect(() => {
    onBudgetChange(budgetId || undefined)
  }, [
    budgetId,
    onBudgetChange
  ])

  return null
}

function BudgetSync({
  Subscribe,
  onBudgetChange
}: {
  Subscribe: SubscribeComponent
  onBudgetChange?: (budgetId?: string) => void
}) {
  if (!onBudgetChange) return null

  return (
    <Subscribe selector={(state) => state.values.budgetId}>
      {(budgetId) => (
        <BudgetSyncLogic
          budgetId={budgetId}
          onBudgetChange={onBudgetChange}
        />
      )}
    </Subscribe>
  )
}

export function TransactionForm({
  defaultValues,
  categories,
  accounts,
  budgets,
  onBudgetChange,
  onTransactionTypeChange,
  recipients = [],
  bills = [],
  preSelectedBillId,
  originalBillAmount,
  onSubmit,
  onCancel,
  submitLabel,
  isEditing = false
}: TransactionFormProps) {
  const { t } = useTranslation()
  const { confirm, confirmDialog } = useConfirmDialog()

  const recurrenceOptions = [
    {
      value: RecurrenceType.NONE,
      label: t('recurrence.none')
    },
    {
      value: RecurrenceType.WEEKLY,
      label: t('recurrence.weekly')
    },
    {
      value: RecurrenceType.MONTHLY,
      label: t('recurrence.monthly')
    },
    {
      value: RecurrenceType.QUARTERLY,
      label: t('recurrence.quarterly')
    },
    {
      value: RecurrenceType.YEARLY,
      label: t('recurrence.yearly')
    },
    {
      value: RecurrenceType.CUSTOM,
      label: t('recurrence.custom')
    }
  ]

  const transactionTypeOptions = [
    {
      value: TransactionType.EXPENSE,
      label: t('transactions.expense')
    },
    {
      value: TransactionType.INCOME,
      label: t('transactions.income')
    },
    {
      value: TransactionType.TRANSFER,
      label: t('common.transfer')
    }
  ]
  // Generate unique ID for the checkbox
  const createBillCheckboxId = useId()
  const useSplitsSwitchId = useId()

  // Bill creation state (separate from form)
  const [createBill, setCreateBill] = useState(false)
  const [billRecipient, setBillRecipient] = useState('')
  const [billStartDate, setBillStartDate] = useState<Date>(new Date())
  const [billRecurrence, setBillRecurrence] = useState<RecurrenceTypeType>(
    RecurrenceType.MONTHLY
  )
  const [billCustomDays, setBillCustomDays] = useState<number | undefined>(
    undefined
  )
  const [billLastPayment, setBillLastPayment] = useState<Date | null>(null)
  const normalizedDefaultSplits = normalizeBackendSplits(defaultValues?.splits)

  // Splits toggle state
  const [useSplits, setUseSplits] = useState(
    !!(normalizedDefaultSplits && normalizedDefaultSplits.length > 0)
  )

  // Determine initial transaction type based on default category
  const getInitialTransactionType = (): 'INCOME' | 'EXPENSE' | 'TRANSFER' => {
    if (defaultValues?.transactionType) {
      return defaultValues.transactionType
    }
    if (defaultValues?.categoryId) {
      const category = categories.find((c) => c.id === defaultValues.categoryId)
      if (category) {
        // Default to matching type, or fallback to first type
        if (category.types.includes('EXPENSE')) return 'EXPENSE'
        if (category.types.includes('INCOME')) return 'INCOME'
      }
    }
    return 'EXPENSE' // Default to expense
  }

  const form = useAppForm({
    defaultValues: {
      name: defaultValues?.name ?? '',
      amount: defaultValues?.amount ?? 0,
      date: defaultValues?.date ?? new Date(),
      transactionType: getInitialTransactionType(),
      category: (defaultValues?.categoryId ?? '') as ComboboxValue,
      accountId: defaultValues?.accountId ?? '',
      transferToAccountId: defaultValues?.transferToAccountId ?? '',
      recipient: (defaultValues?.recipient ??
        defaultValues?.recipientId ??
        null) as ComboboxValue | null,
      notes: defaultValues?.notes ?? '',
      billId: preSelectedBillId ?? defaultValues?.billId ?? null,
      budgetId: defaultValues?.budgetId ?? '',
      instanceId: defaultValues?.instanceId ?? null,
      splits:
        normalizedDefaultSplits && normalizedDefaultSplits.length > 0
          ? normalizedDefaultSplits.map((s) => ({
              subtitle: s.subtitle,
              amount: s.amount,
              category: s.categoryId as ComboboxValue
            }))
          : undefined
    },
    onSubmit: async ({ value }) => {
      type SubmissionValue = {
        name: string
        amount: number
        date: Date
        transactionType: 'INCOME' | 'EXPENSE' | 'TRANSFER'
        accountId: string
        transferToAccountId?: string
        recipient?: ComboboxValue | null
        notes?: string
        billId?: string | null
        budgetId?: string
        instanceId?: string | null
        category?: ComboboxValue
        splits?: typeof value.splits
      }

      // Transform __none__ sentinel back to null for billId
      const transformedValue: SubmissionValue = {
        name: value.name,
        amount: value.amount,
        date: value.date,
        transactionType: value.transactionType,
        accountId: value.accountId,
        transferToAccountId: value.transferToAccountId || undefined,
        recipient: value.recipient,
        notes: value.notes,
        billId: value.billId === NO_BILL_VALUE ? null : value.billId,
        budgetId: value.budgetId || undefined,
        instanceId: value.instanceId,
        category: value.category || undefined,
        splits: value.splits
      }

      // Validate form
      // If useSplits is false, ensure splits array is empty in data to avoid validation confusion or backend issues
      if (
        !useSplits ||
        transformedValue.transactionType !== TransactionType.EXPENSE
      ) {
        transformedValue.splits = undefined
      } else {
        // If splits are used, category is undefined
        transformedValue.category = undefined
      }
      if (transformedValue.transactionType !== TransactionType.EXPENSE) {
        transformedValue.billId = undefined
        transformedValue.budgetId = undefined
      }
      if (transformedValue.transactionType === TransactionType.TRANSFER) {
        transformedValue.category = undefined
        transformedValue.recipient = undefined
      }

      const data = validateForm(transactionSchema, transformedValue)

      const billData = createBill
        ? {
            recipient: billRecipient,
            startDate: billStartDate,
            recurrenceType: billRecurrence,
            customIntervalDays: billCustomDays,
            lastPaymentDate: billLastPayment
          }
        : undefined

      await onSubmit(data, billData)
    }
  })

  // Handle transaction type change
  const handleTransactionTypeChange = (newType: string) => {
    const currentCategory = form.getFieldValue('category')
    if (typeof currentCategory === 'string' && currentCategory) {
      const cat = categories.find((c) => c.id === currentCategory)
      if (cat && !cat.types.includes(newType)) {
        form.setFieldValue('category', '')
      }
    }
    if (newType !== TransactionType.EXPENSE) {
      setUseSplits(false)
    }
    if (newType !== TransactionType.EXPENSE) {
      form.setFieldValue('budgetId', '')
      form.setFieldValue('billId', null)
    }
    if (newType === TransactionType.TRANSFER) {
      form.setFieldValue('recipient', null)
      form.setFieldValue('category', '')
    }
    onTransactionTypeChange?.(newType as 'INCOME' | 'EXPENSE' | 'TRANSFER')
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
      className="space-y-4"
    >
      <AmountSync
        Subscribe={form.Subscribe}
        useSplits={useSplits}
        onAmountChange={(value) => form.setFieldValue('amount', value)}
      />
      <BudgetSync
        Subscribe={form.Subscribe}
        onBudgetChange={onBudgetChange}
      />
      {/* Transaction Type Selector */}
      <form.AppField name="transactionType">
        {(field) => (
          <field.RadioGroupField
            label={t('forms.transactionType')}
            options={transactionTypeOptions}
            onValueChange={handleTransactionTypeChange}
          />
        )}
      </form.AppField>

      <form.AppField
        name="name"
        validators={{
          onChange: createZodValidator(transactionSchema.shape.name)
        }}
      >
        {(field) => (
          <field.TextField
            label={t('forms.transactionName')}
            placeholder={t('forms.placeholderName')}
          />
        )}
      </form.AppField>

      <form.AppField
        name="amount"
        validators={{
          onChange: createZodValidator(transactionSchema.shape.amount)
        }}
      >
        {(field) => (
          <field.NumberField
            label={t('common.amount')}
            placeholder="0.00"
            step="0.01"
            min={0}
          />
        )}
      </form.AppField>

      <form.AppField
        name="date"
        validators={{
          onChange: createZodValidator(transactionSchema.shape.date)
        }}
      >
        {(field) => <field.DateField label={t('common.date')} />}
      </form.AppField>

      {/* Check for Overdraft */}
      <form.Subscribe
        selector={(state) => [
          state.values.budgetId,
          state.values.amount,
          state.values.transactionType
        ]}
      >
        {([budgetId, amount, transactionType]) => {
          if (!budgets || !budgetId || transactionType !== 'EXPENSE')
            return null
          const budget = budgets.find((b) => b.id === budgetId)
          if (!budget) return null

          const numericRemaining = Number(
            (
              budget as {
                remainingAmount?: number | null
              }
            ).remainingAmount ?? 0
          )
          const numericAmount = Number(amount || 0)
          const willOverdraft = numericRemaining - numericAmount < 0

          return (
            <div className="space-y-2">
              <div className="text-sm">
                <span className="text-muted-foreground">
                  {t('validation.remainingIn', {
                    budget: budget.name
                  })}{' '}
                </span>
                <span
                  className={
                    numericRemaining < 0
                      ? 'text-red-500 font-bold'
                      : 'font-bold'
                  }
                >
                  {new Intl.NumberFormat('sv-SE', {
                    style: 'currency',
                    currency: 'SEK'
                  }).format(numericRemaining)}
                </span>
              </div>
              {willOverdraft && (
                <Alert
                  variant="destructive"
                  className="py-2"
                >
                  <AlertTriangleIcon className="h-4 w-4" />
                  <AlertTitle>{t('validation.overdraftTitle')}</AlertTitle>
                  <AlertDescription>
                    {t('validation.overdraftDesc', {
                      amount: new Intl.NumberFormat('sv-SE', {
                        style: 'currency',
                        currency: 'SEK'
                      }).format(Math.abs(numericRemaining - numericAmount))
                    })}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )
        }}
      </form.Subscribe>

      <form.Subscribe selector={(state) => state.values.transactionType}>
        {(transactionType) =>
          transactionType === TransactionType.EXPENSE &&
          budgets &&
          budgets.length > 0 ? (
            <form.AppField
              name="budgetId"
              validators={{
                onChange: createZodValidator(transactionSchema.shape.budgetId)
              }}
            >
              {(field) => (
                <field.SelectField
                  label={t('allocation.drawer.budget')}
                  placeholder={t('forms.selectBudget')}
                  options={budgets.map((b) => ({
                    value: b.id,
                    label: b.name
                  }))}
                />
              )}
            </form.AppField>
          ) : null
        }
      </form.Subscribe>

      {/* Split Transaction Toggle */}
      <form.Subscribe selector={(state) => state.values.transactionType}>
        {(transactionType) =>
          transactionType === 'EXPENSE' && (
            <div className="flex items-center space-x-2 pb-2">
              <Switch
                id={useSplitsSwitchId}
                checked={useSplits}
                onCheckedChange={async (checked) => {
                  if (
                    !checked &&
                    (form.getFieldValue('splits') || []).length > 1
                  ) {
                    const isConfirmed = await confirm({
                      description: t('validation.disableSplitsConfirm'),
                      confirmText: t('common.confirm')
                    })
                    if (!isConfirmed) {
                      toast.info(t('common.cancelled'))
                      return
                    }
                    // Reset to single split (optional, or just let validatForm handle it?
                    // form.setFieldValue('splits', [form.getFieldValue('splits')[0]])
                  }
                  setUseSplits(checked)
                }}
              />
              <Label
                htmlFor={useSplitsSwitchId}
                className="cursor-pointer"
              >
                {t('forms.splitTransaction')}
              </Label>
            </div>
          )
        }
      </form.Subscribe>

      {/* Category Combobox OR Splits Editor */}
      <form.Subscribe selector={(state) => state.values.transactionType}>
        {(transactionType) =>
          transactionType === TransactionType.TRANSFER ? null : !useSplits ? (
            (() => {
              const filteredCategories = categories.filter((cat) =>
                cat.types.includes(transactionType)
              )
              const categoryOptions = filteredCategories.map((cat) => ({
                value: cat.id,
                label: cat.name
              }))

              return (
                <form.AppField name="category">
                  {(field) => (
                    <field.ComboboxField
                      label={t('common.category')}
                      placeholder={t('forms.selectCategory')}
                      searchPlaceholder={t('forms.searchCategories')}
                      emptyText={t('forms.noCategories')}
                      options={categoryOptions}
                      allowCreate
                      createLabel={
                        transactionType === TransactionType.INCOME
                          ? t('forms.createIncomeCategory')
                          : t('forms.createExpenseCategory')
                      }
                    />
                  )}
                </form.AppField>
              )
            })()
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">{t('forms.sections')}</h3>
                <form.Subscribe selector={(state) => state.values.splits}>
                  {(splits) => {
                    const totalSplits =
                      splits?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0
                    const totalDiff = totalSplits - form.getFieldValue('amount')
                    const isZeroDiff = Math.abs(totalDiff) < 0.01

                    return (
                      <div className="flex flex-col items-end">
                        <span
                          className={`text-sm font-medium ${
                            !isZeroDiff ? 'text-red-500' : 'text-green-600'
                          }`}
                        >
                          {`${t('forms.total')}: `}
                          {new Intl.NumberFormat('sv-SE', {
                            style: 'currency',
                            currency: 'SEK'
                          }).format(totalSplits)}
                          {/* {!isZeroDiff &&
												` (Diff: ${new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(totalDiff)})`} */}
                        </span>
                        {originalBillAmount !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            {`${t('forms.billAmount')}: `}
                            {new Intl.NumberFormat('sv-SE', {
                              style: 'currency',
                              currency: 'SEK'
                            }).format(originalBillAmount)}
                            {Math.abs(totalSplits - originalBillAmount) >
                              0.001 && (
                              <span
                                className={
                                  totalSplits > originalBillAmount
                                    ? 'text-red-500 ml-1'
                                    : 'text-green-600 ml-1'
                                }
                              >
                                {`(${totalSplits > originalBillAmount ? '+' : ''}${new Intl.NumberFormat(
                                  'sv-SE',
                                  {
                                    style: 'currency',
                                    currency: 'SEK'
                                  }
                                ).format(totalSplits - originalBillAmount)})`}
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    )
                  }}
                </form.Subscribe>
              </div>

              <form.Field
                name="splits"
                mode="array"
              >
                {(field) => (
                  <div className="space-y-3">
                    {(field.state.value || []).map((split, index) => (
                      <Card
                        key={`${split.subtitle}-${split.amount}-${String(split.category ?? '')}`}
                        className="bg-muted/30"
                      >
                        <CardContent className="p-3 space-y-3">
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <form.AppField
                                name={`splits[${index}].subtitle`}
                                validators={{
                                  onChange: createZodValidator(
                                    z.string().min(1, t('forms.requiredField'))
                                  )
                                }}
                              >
                                {(subField) => (
                                  <subField.TextField
                                    label={
                                      index === 0 ? t('forms.subtitle') : ''
                                    }
                                    placeholder={t('forms.subtitlePlaceholder')}
                                  />
                                )}
                              </form.AppField>
                            </div>
                            <div className="w-32">
                              <form.AppField
                                name={`splits[${index}].amount`}
                                validators={{
                                  onChange: createZodValidator(
                                    z.number().positive()
                                  )
                                }}
                              >
                                {(amtField) => (
                                  <amtField.NumberField
                                    label={
                                      index === 0 ? t('common.amount') : ''
                                    }
                                    placeholder={t('forms.amountPlaceholder')}
                                    min={0}
                                    step="1"
                                  />
                                )}
                              </form.AppField>
                            </div>
                            <div className="pt-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={index === 0 ? 'mt-6' : ''}
                                onClick={() => field.removeValue(index)}
                                disabled={
                                  (field.state.value || []).length === 1
                                }
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>

                          <form.AppField
                            name={`splits[${index}].category`}
                            validators={{
                              onChange: createZodValidator(
                                z.union([
                                  z
                                    .string()
                                    .min(1, t('validation.categoryRequired')),
                                  z.object({
                                    isNew: z.literal(true),
                                    name: z
                                      .string()
                                      .min(1, t('forms.categoryNameRequired'))
                                  })
                                ])
                              )
                            }}
                          >
                            {(catField) => (
                              <catField.ComboboxField
                                label={index === 0 ? t('common.category') : ''}
                                placeholder={t('forms.selectCategory')}
                                options={categories
                                  .filter((c) => c.types.includes('EXPENSE'))
                                  .map((c) => ({
                                    value: c.id,
                                    label: c.name
                                  }))}
                                allowCreate
                                createLabel={t('forms.createExpenseCategory')}
                              />
                            )}
                          </form.AppField>
                        </CardContent>
                      </Card>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        field.pushValue({
                          subtitle: '',
                          amount: 0,
                          category: ''
                        })
                      }
                      className="w-full border-dashed"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t('forms.addSection')}
                    </Button>
                  </div>
                )}
              </form.Field>
            </div>
          )
        }
      </form.Subscribe>

      <form.AppField
        name="accountId"
        validators={{
          onChange: createZodValidator(transactionSchema.shape.accountId)
        }}
      >
        {(field) => (
          <field.SelectField
            label={t('common.account')}
            placeholder={t('forms.selectAccount')}
            options={accounts.map((acc) => ({
              value: acc.id,
              label: acc.name
            }))}
          />
        )}
      </form.AppField>

      <form.Subscribe
        selector={(state) => [
          state.values.transactionType,
          state.values.accountId
        ]}
      >
        {([transactionType, accountId]) =>
          transactionType === TransactionType.TRANSFER ? (
            <form.AppField
              name="transferToAccountId"
              validators={{
                onChange: createZodValidator(
                  transactionSchema.shape.transferToAccountId
                )
              }}
            >
              {(field) => (
                <field.SelectField
                  label={t('transfers.toAccount')}
                  placeholder={t('transfers.selectToAccount')}
                  options={accounts
                    .filter((acc) => acc.id !== accountId)
                    .map((acc) => ({
                      value: acc.id,
                      label: acc.name
                    }))}
                />
              )}
            </form.AppField>
          ) : null
        }
      </form.Subscribe>

      {/* Recipient/Sender field - label changes based on transaction type */}
      <form.Subscribe selector={(state) => state.values.transactionType}>
        {(transactionType) => {
          if (transactionType === TransactionType.TRANSFER) return null
          // Create options for recipients
          const recipientOptions = recipients.map((r) => ({
            value: r.id,
            label: r.name
          }))

          const fieldLabel =
            transactionType === TransactionType.INCOME
              ? t('income.source')
              : t('forms.recipientOptional')
          const placeholderText =
            transactionType === TransactionType.INCOME
              ? t('forms.whoSent')
              : t('forms.whoReceives')
          const createLabelText =
            transactionType === TransactionType.INCOME
              ? t('forms.addSender')
              : t('forms.addRecipient')

          return (
            <form.AppField name="recipient">
              {(field) => (
                <field.ComboboxField
                  label={fieldLabel}
                  placeholder={placeholderText}
                  searchPlaceholder={t('forms.searchPlaceholder')}
                  emptyText={t('forms.noMatches')}
                  options={recipientOptions}
                  allowCreate
                  createLabel={createLabelText}
                />
              )}
            </form.AppField>
          )
        }}
      </form.Subscribe>

      <form.AppField
        name="notes"
        validators={{
          onChange: createZodValidator(transactionSchema.shape.notes)
        }}
      >
        {(field) => (
          <field.TextField
            label={t('forms.notesOptional')}
            placeholder={t('forms.notesPlaceholder')}
          />
        )}
      </form.AppField>

      {/* Bill Selection/Creation */}
      <form.Subscribe selector={(state) => state.values.transactionType}>
        {(transactionType) =>
          !isEditing && transactionType === TransactionType.EXPENSE ? (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={createBillCheckboxId}
                  checked={createBill}
                  onCheckedChange={(checked) =>
                    setCreateBill(checked as boolean)
                  }
                />
                <Label
                  htmlFor={createBillCheckboxId}
                  className="cursor-pointer"
                >
                  {t('transactions.createBill')}
                </Label>
              </div>

              {!createBill && bills.length > 0 && (
                <form.AppField
                  name="billId"
                  validators={{
                    onChange: createZodValidator(transactionSchema.shape.billId)
                  }}
                >
                  {(field) => (
                    <field.SelectField
                      label={t('forms.linkToBillOptional')}
                      placeholder={t('forms.selectBill')}
                      options={[
                        {
                          value: NO_BILL_VALUE,
                          label: t('forms.noBill')
                        },
                        ...bills.map((bill) => ({
                          value: bill.id,
                          label: `${bill.name} - ${bill.recipient}`
                        }))
                      ]}
                    />
                  )}
                </form.AppField>
              )}

              {createBill && (
                <div className="space-y-4 bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold text-sm">
                    {t('forms.billDetails')}
                  </h4>

                  <div className="space-y-2">
                    <Label>{t('common.recipient')}</Label>
                    <input
                      type="text"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={billRecipient}
                      onChange={(e) => setBillRecipient(e.target.value)}
                      placeholder={t('forms.recipientPlaceholder')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('forms.startDateFirstPayment')}</Label>
                    <input
                      type="date"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={billStartDate.toISOString().split('T')[0]}
                      onChange={(e) =>
                        setBillStartDate(new Date(e.target.value))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('recurrence.label')}</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={billRecurrence}
                      onChange={(e) =>
                        setBillRecurrence(e.target.value as RecurrenceTypeType)
                      }
                    >
                      {recurrenceOptions.map((opt) => (
                        <option
                          key={opt.value}
                          value={opt.value}
                        >
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {billRecurrence === RecurrenceType.CUSTOM && (
                    <div className="space-y-2">
                      <Label>{t('forms.daysBetweenPayments')}</Label>
                      <input
                        type="number"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={billCustomDays ?? ''}
                        onChange={(e) =>
                          setBillCustomDays(Number(e.target.value) || undefined)
                        }
                        placeholder={t('forms.daysExample')}
                        min={1}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>{t('forms.lastPaymentDateOptional')}</Label>
                    <input
                      type="date"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={billLastPayment?.toISOString().split('T')[0] ?? ''}
                      onChange={(e) =>
                        setBillLastPayment(
                          e.target.value ? new Date(e.target.value) : null
                        )
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('forms.billLastPaymentDesc')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : null
        }
      </form.Subscribe>

      <form.AppForm>
        <form.FormButtonGroup
          onCancel={onCancel}
          submitLabel={submitLabel}
        />
      </form.AppForm>
      {confirmDialog}
    </form>
  )
}

// Re-export types for consumers
export type { TransactionFormData }
