import { FileTextIcon, PlusIcon } from 'lucide-react'
import { useCallback, useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import {
  BillPaymentHandling,
  CategoryType,
  RecurrenceType
} from '@/api/generated/types.gen'
import { Button } from '@/components/button/button'
import {
  type ComboboxValue,
  createTranslatedZodValidator,
  useAppForm
} from '@/components/form'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/contexts/auth-context'
import {
  useAccountsList,
  useBudgetsList,
  useCategoriesList,
  useCreateBill,
  useRecipientsList
} from '@/hooks/api'
import { getErrorMessage } from '@/lib/api-error'
import { formatAccountLabel } from '@/lib/accounts'
import {
  safeValidateForm,
  translateIfLikelyI18nKey
} from '@/lib/form-validation'
import { nullablePositiveNumber } from '@/lib/zod-nullable-number'
import { withSplitTotalsCoercedForValidation } from './bill-split-form-payload'
import type { CreateBillDrawerForm } from './form-api'
import { buildCreateBillBody } from './map-to-request'
import { createBillDrawerSchema } from './schema'
import { SplitBillBlock } from './split-bill-block'
import {
  type BillSplitRowValue,
  CREATE_BILL_DRAWER_DEFAULTS,
  type CreateBillDrawerFormValues,
  newBillSplitRow
} from './types'

export type CreateBillDrawerProps = {
  onClose: () => void
}

export function CreateBillDrawer({ onClose }: CreateBillDrawerProps) {
  const { t } = useTranslation()
  const { userId, householdId } = useAuth()
  const [useSplits, setUseSplits] = useState(false)
  const [expandedSplitIds, setExpandedSplitIds] = useState<
    Record<string, boolean>
  >({})
  const splitSwitchId = useId()

  const { mutate: createBill, isPending } = useCreateBill()

  const { data: accounts = [] } = useAccountsList({
    householdId,
    userId,
    enabled: Boolean(householdId),
    excludeArchived: true
  })

  const { data: budgets = [] } = useBudgetsList({
    householdId,
    userId,
    enabled: Boolean(householdId)
  })

  const { data: recipients = [] } = useRecipientsList({
    householdId,
    userId,
    enabled: Boolean(householdId)
  })

  const form = useAppForm({
    defaultValues: CREATE_BILL_DRAWER_DEFAULTS,
    canSubmitWhenInvalid: true,
    onSubmitInvalid: ({ formApi }) => {
      const formErrors = formApi.state.errors as unknown[]
      for (const err of formErrors) {
        if (typeof err === 'string' && err.length > 0) {
          toast.error(translateIfLikelyI18nKey(err, t))
          return
        }
      }
      for (const meta of Object.values(formApi.state.fieldMeta)) {
        const m = meta as {
          errors?: unknown[]
        }
        const first = m?.errors?.[0]
        if (typeof first === 'string' && first.length > 0) {
          toast.error(translateIfLikelyI18nKey(first, t))
          return
        }
      }
      toast.error(t('common.error'))
    },
    onSubmit: async ({ value }) => {
      const hasSplits = (value.splits?.length ?? 0) > 0

      const payload: CreateBillDrawerFormValues = {
        ...value,
        splits: hasSplits ? value.splits : []
      }

      const parsed = safeValidateForm(
        createBillDrawerSchema,
        withSplitTotalsCoercedForValidation(payload)
      )
      if (!parsed.success) {
        const msg = parsed.errors[0]?.message ?? 'common.error'
        toast.error(translateIfLikelyI18nKey(msg, t))
        return
      }

      if (!householdId) {
        toast.error(t('server.badRequest.missingHouseholdId'))
        return
      }

      const data = parsed.data
      const body = buildCreateBillBody({
        t,
        data,
        hasSplits
      })

      createBill(
        {
          householdId,
          userId,
          ...body
        },
        {
          onSuccess: () => {
            toast.success(t('bills.createSuccess'))
            onClose()
          },
          onError: (err) => {
            toast.error(getErrorMessage(err))
          }
        }
      )
    }
  })

  const accountOptions = useMemo(
    () =>
      accounts.map((a) => ({
        value: a.id,
        label: formatAccountLabel(a)
      })),
    [
      accounts
    ]
  )

  const budgetOptions = useMemo(
    () =>
      budgets.map((b) => ({
        value: b.id,
        label: b.name
      })),
    [
      budgets
    ]
  )

  const recipientOptions = useMemo(
    () =>
      recipients.map((r) => ({
        value: r.id,
        label: r.name
      })),
    [
      recipients
    ]
  )

  const recurrenceOptions = useMemo(
    () => [
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
    ],
    [
      t
    ]
  )

  const paymentHandlingOptions = useMemo(
    () => [
      {
        value: BillPaymentHandling.AUTOGIRO,
        label: t('bills.paymentHandling.AUTOGIRO')
      },
      {
        value: BillPaymentHandling.E_INVOICE,
        label: t('bills.paymentHandling.E_INVOICE')
      },
      {
        value: BillPaymentHandling.MAIL,
        label: t('bills.paymentHandling.MAIL')
      },
      {
        value: BillPaymentHandling.PORTAL,
        label: t('bills.paymentHandling.PORTAL')
      },
      {
        value: BillPaymentHandling.PAPER,
        label: t('bills.paymentHandling.PAPER')
      },
      {
        value: BillPaymentHandling.CARD,
        label: t('bills.paymentHandling.CARD')
      }
    ],
    [
      t
    ]
  )

  const nameValidator = useMemo(
    () => createTranslatedZodValidator(createBillDrawerSchema.shape.name, t),
    [
      t
    ]
  )
  const accountValidator = useMemo(
    () =>
      createTranslatedZodValidator(createBillDrawerSchema.shape.accountId, t),
    [
      t
    ]
  )
  const dueDateValidator = useMemo(
    () => createTranslatedZodValidator(createBillDrawerSchema.shape.dueDate, t),
    [
      t
    ]
  )
  const amountWhenNotSplitValidator = useMemo(
    () =>
      createTranslatedZodValidator(
        nullablePositiveNumber('validation.positive'),
        t
      ),
    [
      t
    ]
  )

  const recipientValidator = useMemo(
    () =>
      ({ value }: { value: unknown }) => {
        const r = value as ComboboxValue | null
        const hasRecipient =
          typeof r === 'string'
            ? r.length > 0
            : typeof r === 'object' &&
              r !== null &&
              'isNew' in r &&
              r.isNew &&
              typeof r.name === 'string' &&
              r.name.trim().length > 0
        if (!hasRecipient) return t('validation.recipientRequired')
        return undefined
      },
    [
      t
    ]
  )

  const budgetRequiredValidator = useMemo(
    () =>
      createTranslatedZodValidator(z.string().min(1, 'validation.required'), t),
    [
      t
    ]
  )

  const toggleSplit = useCallback(
    (checked: boolean) => {
      setUseSplits(checked)
      if (checked) {
        const parentBudget = form.getFieldValue('budgetId') as string
        const row = newBillSplitRow()
        if (typeof parentBudget === 'string' && parentBudget.length > 0) {
          row.budgetId = parentBudget
        }
        form.setFieldValue('splits', [
          row
        ])
        form.setFieldValue('amount', null)
        form.setFieldValue('budgetId', '')
        form.setFieldValue('category', null)
        setExpandedSplitIds({
          [row.id]: true
        })
      } else {
        form.setFieldValue('splits', [])
      }
    },
    [
      form
    ]
  )

  const turnOffSplits = useCallback(() => {
    setUseSplits(false)
    form.setFieldValue('splits', [])
    setExpandedSplitIds({})
  }, [
    form
  ])

  const addSplit = useCallback(() => {
    const prev = form.getFieldValue('splits') as BillSplitRowValue[] | undefined
    const template = prev?.[prev.length - 1]?.budgetId ?? ''
    const row = newBillSplitRow()
    if (template.length > 0) {
      row.budgetId = template
    }
    form.setFieldValue('splits', [
      ...(prev ?? []),
      row
    ])
    setExpandedSplitIds((m) => ({
      ...m,
      [row.id]: true
    }))
  }, [
    form
  ])

  const removeSplit = useCallback(
    (index: number) => {
      form.setFieldValue('splits', (prev) => {
        const next = [
          ...(prev ?? [])
        ]
        const removed = next[index]
        if (removed) {
          setExpandedSplitIds((m) => {
            const { [removed.id]: _, ...rest } = m
            return rest
          })
        }
        next.splice(index, 1)
        return next
      })
    },
    [
      form
    ]
  )

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
        <form.AppField
          name="name"
          validators={{
            onSubmit: nameValidator
          }}
        >
          {(field) => (
            <field.TextField
              label={t('forms.billNameLabel')}
              placeholder={t('forms.billNamePlaceholder')}
              prependIcon={FileTextIcon}
            />
          )}
        </form.AppField>

        <form.AppField
          name="recipient"
          validators={{
            onSubmit: recipientValidator
          }}
        >
          {(field) => (
            <field.ComboboxField
              label={t('common.recipient')}
              placeholder={t('forms.whoReceives')}
              searchPlaceholder={t('forms.searchPlaceholder')}
              emptyText={t('forms.noMatches')}
              options={recipientOptions}
              allowCreate
              createLabel={t('forms.addRecipient')}
            />
          )}
        </form.AppField>

        <form.AppField
          name="accountId"
          validators={{
            onSubmit: accountValidator
          }}
        >
          {(field) => (
            <field.SelectField
              label={t('transfers.fromAccount')}
              placeholder={t('forms.selectAccount')}
              options={accountOptions}
            />
          )}
        </form.AppField>

        <form.AppField name="recurrenceType">
          {(field) => (
            <field.SelectField
              label={t('recurrence.label')}
              placeholder={t('forms.selectRecurrence')}
              options={recurrenceOptions}
            />
          )}
        </form.AppField>

        <form.Subscribe selector={(s) => s.values.recurrenceType}>
          {(recurrenceType) =>
            recurrenceType === RecurrenceType.CUSTOM ? (
              <form.AppField name="customIntervalDays">
                {(field) => (
                  <field.NumberField
                    label={t('forms.daysBetweenPayments')}
                    placeholder={t('forms.daysExample')}
                    min={1}
                  />
                )}
              </form.AppField>
            ) : null
          }
        </form.Subscribe>

        <form.AppField name="paymentHandling">
          {(field) => (
            <field.SelectField
              label={t('common.handling')}
              placeholder={t('forms.selectHandling')}
              options={paymentHandlingOptions}
            />
          )}
        </form.AppField>

        <form.AppField
          name="dueDate"
          validators={{
            onSubmit: dueDateValidator
          }}
        >
          {(field) => (
            <field.DateField
              label={t('forms.startDate')}
              labelHelpText={t('forms.billStartDateHelp')}
              calendarPosition="start"
            />
          )}
        </form.AppField>

        <form.AppField name="endDate">
          {(field) => (
            <field.DateField
              label={t('forms.endDateOptional')}
              labelHelpText={t('forms.endDateDesc')}
              calendarPosition="start"
            />
          )}
        </form.AppField>

        <div className="flex items-center gap-2">
          <Switch
            checked={useSplits}
            onCheckedChange={toggleSplit}
            id={splitSwitchId}
          />
          <label
            htmlFor={splitSwitchId}
            className="type-label cursor-pointer text-black"
          >
            {t('forms.splitThisBill')}
          </label>
        </div>

        {useSplits ? (
          <SplitBillBlock
            form={form}
            householdId={householdId ?? ''}
            userId={userId ?? ''}
            expandedSplitIds={expandedSplitIds}
            setExpandedSplitIds={setExpandedSplitIds}
            addSplit={addSplit}
            removeSplit={removeSplit}
            turnOffSplits={turnOffSplits}
          />
        ) : null}

        {!useSplits ? (
          <>
            <form.AppField
              name="amount"
              validators={{
                onSubmit: (opts) => {
                  const splitRows = form.getFieldValue('splits')
                  if ((splitRows?.length ?? 0) > 0) return undefined
                  return amountWhenNotSplitValidator(opts)
                }
              }}
            >
              {(field) => <field.NumberField label={t('common.amount')} />}
            </form.AppField>

            <form.AppField
              name="budgetId"
              validators={{
                onSubmit: (opts) => {
                  const splitRows = form.getFieldValue('splits')
                  if ((splitRows?.length ?? 0) > 0) return undefined
                  return budgetRequiredValidator(opts)
                }
              }}
            >
              {(field) => (
                <field.SelectField
                  label={t('allocation.drawer.budget')}
                  placeholder={t('forms.selectBudget')}
                  options={budgetOptions}
                />
              )}
            </form.AppField>

            <form.Subscribe
              selector={(s) => ({
                budgetId: s.values.budgetId
              })}
            >
              {({ budgetId }) => (
                <BillCategoryField
                  form={form}
                  householdId={householdId ?? ''}
                  userId={userId ?? ''}
                  budgetId={budgetId ?? ''}
                />
              )}
            </form.Subscribe>
          </>
        ) : null}
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
              icon={<PlusIcon aria-hidden />}
              label={t('bills.drawerSubmit')}
              disabled={isSubmitting || isPending}
              onClick={() => void 0}
            />
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}

function BillCategoryField({
  form,
  householdId,
  userId,
  budgetId
}: {
  form: CreateBillDrawerForm
  householdId: string
  userId: string
  budgetId: string
}) {
  const { t } = useTranslation()

  const { data: expenseCategories = [] } = useCategoriesList({
    householdId,
    userId,
    budgetId: budgetId || undefined,
    type: CategoryType.EXPENSE,
    enabled: Boolean(householdId && budgetId)
  })

  const expenseCategoryOptions = useMemo(
    () =>
      expenseCategories
        .filter((c) => !c.archived && c.types.includes(CategoryType.EXPENSE))
        .map((c) => ({
          value: c.id,
          label: c.name
        })),
    [
      expenseCategories
    ]
  )

  return (
    <form.AppField
      name="category"
      validators={{
        onSubmit: ({ value }: { value: unknown }) => {
          const splitRows = form.getFieldValue('splits')
          if ((splitRows?.length ?? 0) > 0) return undefined
          const v = value as ComboboxValue | null
          if (typeof v === 'string' && v.length > 0) return undefined
          if (
            typeof v === 'object' &&
            v !== null &&
            'isNew' in v &&
            v.isNew &&
            v.name.trim().length > 0
          ) {
            return undefined
          }
          return t('validation.categoryRequired')
        }
      }}
    >
      {(field) => (
        <field.ComboboxField
          label={t('common.category')}
          placeholder={t('forms.selectCategory')}
          searchPlaceholder={t('forms.searchCategories')}
          emptyText={t('forms.noCategories')}
          options={expenseCategoryOptions}
          allowCreate
          createLabel={t('forms.createExpenseCategory')}
        />
      )}
    </form.AppField>
  )
}
