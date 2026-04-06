/**
 * AccountForm - Form for creating and editing accounts
 */

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import {
  createZodValidator,
  safeValidateForm,
  useAppForm
} from '@/components/form'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

const createAccountSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(1, t('validation.accountNameRequired')),
    externalIdentifier: z.string().optional(),
    initialBalance: z.preprocess(
      (val) => (val === null ? 0 : val),
      z.number().min(0, t('budgets.drawerInitialBudgetMin'))
    ),
    budgetIds: z.array(z.string()).optional()
  })

type AccountFormData = z.infer<ReturnType<typeof createAccountSchema>>

export interface AccountFormProps {
  /**
   * Initial values for editing an existing account
   */
  defaultValues?: Partial<AccountFormData> & {
    initialBalance?: number | null
  }

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

  /**
   * Available budgets for linking
   */
  budgets?: Array<{
    id: string
    name: string
  }>
}

export function AccountForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel,
  budgets = []
}: AccountFormProps) {
  const { t } = useTranslation()
  const accountSchema = useMemo(
    () => createAccountSchema(t),
    [
      t
    ]
  )
  const effectiveSubmitLabel = submitLabel ?? t('common.save')
  // All budgets selected by default for new accounts
  const [selectedBudgets, setSelectedBudgets] = useState<string[]>(
    defaultValues?.budgetIds ?? budgets.map((b) => b.id)
  )

  const form = useAppForm({
    defaultValues: {
      name: defaultValues?.name ?? '',
      externalIdentifier: defaultValues?.externalIdentifier ?? '',
      initialBalance: defaultValues?.initialBalance ?? null,
      budgetIds: defaultValues?.budgetIds ?? budgets.map((b) => b.id)
    },
    onSubmit: async ({ value }) => {
      const result = safeValidateForm(accountSchema, {
        ...value,
        budgetIds: selectedBudgets
      })
      if (!result.success) {
        console.error('Account form validation failed', result.errors)
        return
      }
      await onSubmit(result.data)
    }
  })

  const toggleBudget = (budgetId: string) => {
    setSelectedBudgets((prev) =>
      prev.includes(budgetId)
        ? prev.filter((id) => id !== budgetId)
        : [
            ...prev,
            budgetId
          ]
    )
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
      <form.AppField
        name="name"
        validators={{
          onChange: createZodValidator(accountSchema.shape.name)
        }}
      >
        {(field) => (
          <field.TextField
            label={t('forms.accountName')}
            placeholder={t('forms.accountNamePlaceholder')}
          />
        )}
      </form.AppField>

      <form.AppField
        name="externalIdentifier"
        validators={{
          onChange: createZodValidator(accountSchema.shape.externalIdentifier)
        }}
      >
        {(field) => (
          <field.TextField
            label={t('forms.externalId')}
            description={t('forms.externalIdDesc')}
            placeholder={t('forms.externalIdPlaceholder')}
          />
        )}
      </form.AppField>

      <form.AppField
        name="initialBalance"
        validators={{
          onChange: createZodValidator(accountSchema.shape.initialBalance)
        }}
      >
        {(field) => (
          <field.NumberField
            label={t('forms.initialBalance')}
            placeholder={t('forms.zeroPlaceholder')}
            min={0}
          />
        )}
      </form.AppField>

      {/* Budget Selection */}
      {budgets.length > 0 && (
        <div className="space-y-3">
          <Label>{t('forms.linkToBudgets')}</Label>
          <p className="text-sm text-muted-foreground">
            {t('forms.linkToBudgetsDesc')}
          </p>
          <div className="space-y-2">
            {budgets.map((budget) => (
              <div
                key={budget.id}
                className="flex items-center space-x-2"
              >
                <Checkbox
                  id={`budget-${budget.id}`}
                  checked={selectedBudgets.includes(budget.id)}
                  onCheckedChange={() => toggleBudget(budget.id)}
                />
                <Label
                  htmlFor={`budget-${budget.id}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {budget.name}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      <form.AppForm>
        <form.FormButtonGroup
          onCancel={onCancel}
          submitLabel={effectiveSubmitLabel}
        />
      </form.AppForm>
    </form>
  )
}
