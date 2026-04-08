import { Check, FileTextIcon } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
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
  useBillsList,
  useBudgetsList,
  useCategoriesList,
  useRecipientsList,
  useUpdateBill
} from '@/hooks/api'
import { getErrorMessage } from '@/lib/api-error'
import {
  safeValidateForm,
  translateIfLikelyI18nKey
} from '@/lib/form-validation'
import { normalizeBackendSplits } from '@/lib/split-normalization'
import { nullablePositiveNumber } from '@/lib/zod-nullable-number'
import { withSplitTotalsCoercedForValidation } from '../create-bill-drawer/bill-split-form-payload'
import { mapBillSplitsToFormRows } from '../create-bill-drawer/bill-split-rows'
import type { CreateBillDrawerForm } from '../create-bill-drawer/form-api'
import { createBillDrawerSchema } from '../create-bill-drawer/schema'
import { SplitBillBlock } from '../create-bill-drawer/split-bill-block'
import {
  type BillSplitRowValue,
  CREATE_BILL_DRAWER_DEFAULTS,
  newBillSplitRow
} from '../create-bill-drawer/types'

import { buildUpdateBillVariablesFromBlueprintForm } from './map-to-update-request'

export type EditBillBlueprintMode = 'upcoming' | 'all'

export type EditBillBlueprintDrawerProps = {
  billId: string
  mode: EditBillBlueprintMode
  onClose: () => void
}

const BLUEPRINT_FORM_DEFAULTS = {
  ...CREATE_BILL_DRAWER_DEFAULTS,
  scopeChangeDate: new Date()
}

export function EditBillBlueprintDrawer({
  billId,
  mode,
  onClose
}: EditBillBlueprintDrawerProps) {
  const { t } = useTranslation()
  const { userId, householdId } = useAuth()
  const [hasInitializedForm, setHasInitializedForm] = useState(false)
  const [useSplits, setUseSplits] = useState(false)
  const [expandedSplitIds, setExpandedSplitIds] = useState<
    Record<string, boolean>
  >({})
  const splitSwitchId = useId()
  const templateHadSplitsAtOpenRef = useRef(false)

  const { mutate: updateBill, isPending } = useUpdateBill()

  const { data: bills = [], isPending: billsLoading } = useBillsList({
    householdId,
    userId,
    enabled: Boolean(householdId)
  })

  const bill = useMemo(
    () => bills.find((b) => b.id === billId),
    [
      bills,
      billId
    ]
  )

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

  const accountOptions = useMemo(
    () =>
      accounts.map((a) => ({
        value: a.id,
        label: a.name
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
    () =>
      [
        BillPaymentHandling.AUTOGIRO,
        BillPaymentHandling.E_INVOICE,
        BillPaymentHandling.MAIL,
        BillPaymentHandling.PORTAL,
        BillPaymentHandling.PAPER,
        BillPaymentHandling.CARD
      ].map((value) => ({
        value,
        label: t(`bills.paymentHandling.${value}`)
      })),
    [
      t
    ]
  )

  const form = useAppForm({
    defaultValues: BLUEPRINT_FORM_DEFAULTS,
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
      const extended = value as typeof value & {
        scopeChangeDate?: Date
      }
      const scopeChangeDateValue =
        extended.scopeChangeDate instanceof Date
          ? extended.scopeChangeDate
          : bill?.dueDate

      const hasSplits = (value.splits?.length ?? 0) > 0
      const payload = {
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

      if (!bill || !householdId) {
        toast.error(t('bills.notFound'))
        return
      }

      try {
        const vars = buildUpdateBillVariablesFromBlueprintForm({
          t,
          data: parsed.data,
          mode,
          scopeChangeDate:
            mode === 'upcoming'
              ? (scopeChangeDateValue ?? bill.dueDate)
              : undefined,
          debitInstant: parsed.data.dueDate,
          previousLastPaymentDate: bill.lastPaymentDate ?? undefined,
          templateHadSplitsAtOpen: templateHadSplitsAtOpenRef.current
        })

        updateBill(
          {
            id: billId,
            userId,
            ...vars
          },
          {
            onSuccess: () => {
              toast.success(t('bills.updateSuccess'))
              onClose()
            },
            onError: (err) => toast.error(getErrorMessage(err))
          }
        )
      } catch (err) {
        toast.error(getErrorMessage(err))
      }
    }
  })

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset when switching bill or mode
  useEffect(() => {
    setHasInitializedForm(false)
    templateHadSplitsAtOpenRef.current = false
  }, [
    billId,
    mode
  ])

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

  useEffect(() => {
    if (!bill || hasInitializedForm) return

    const normalized = normalizeBackendSplits(bill.splits)
    templateHadSplitsAtOpenRef.current = Boolean(
      normalized && normalized.length > 0
    )

    form.setFieldValue('name', bill.name)
    form.setFieldValue('recipient', bill.recipient.id)
    form.setFieldValue('accountId', bill.account.id)
    form.setFieldValue('recurrenceType', bill.recurrenceType)
    form.setFieldValue(
      'customIntervalDays',
      bill.customIntervalDays ?? undefined
    )
    form.setFieldValue(
      'paymentHandling',
      bill.paymentHandling ? String(bill.paymentHandling) : ''
    )
    form.setFieldValue(
      'dueDate',
      mode === 'upcoming'
        ? (bill.lastPaymentDate ?? bill.dueDate)
        : bill.dueDate
    )
    form.setFieldValue('endDate', bill.endDate ?? null)
    form.setFieldValue('scopeChangeDate', bill.dueDate)

    if (normalized && normalized.length > 0) {
      setUseSplits(true)
      const rows = mapBillSplitsToFormRows(normalized, {
        defaultBudgetId: bill.budget?.id
      })
      form.setFieldValue('splits', rows)
      form.setFieldValue(
        'amount',
        normalized.reduce((s, x) => s + x.amount, 0)
      )
      form.setFieldValue('budgetId', '')
      form.setFieldValue('category', null)
      setExpandedSplitIds(
        Object.fromEntries(
          rows.map(
            (r) =>
              [
                r.id,
                true
              ] as const
          )
        )
      )
    } else {
      setUseSplits(false)
      form.setFieldValue('splits', [])
      form.setFieldValue('amount', bill.estimatedAmount)
      form.setFieldValue('budgetId', bill.budget?.id ?? '')
      form.setFieldValue('category', bill.category?.id ?? null)
      setExpandedSplitIds({})
    }

    setHasInitializedForm(true)
  }, [
    bill,
    form,
    hasInitializedForm,
    mode
  ])

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

  if (billsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="type-body text-gray-800">{t('common.loading')}</p>
      </div>
    )
  }

  if (!bill) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="type-body text-gray-800">{t('bills.notFound')}</p>
      </div>
    )
  }

  if (!hasInitializedForm) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="type-body text-gray-800">{t('common.loading')}</p>
      </div>
    )
  }

  const typedForm = form as unknown as CreateBillDrawerForm

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
        {mode === 'upcoming' ? (
          <form.AppField name="scopeChangeDate">
            {(field) => (
              <field.DateField
                label={t('bills.editBlueprintDrawer.changeDateLabel')}
                labelHelpText={t('bills.editBlueprintDrawer.changeDateHelp')}
                calendarPosition="start"
              />
            )}
          </form.AppField>
        ) : null}

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
              labelHelpText={
                mode === 'upcoming'
                  ? t('bills.editBlueprintDrawer.debitDateHelpUpcoming')
                  : t('forms.billStartDateHelp')
              }
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
            form={typedForm}
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
                <BlueprintBillCategoryField
                  form={typedForm}
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
              icon={<Check aria-hidden />}
              label={t('bills.editBlueprintDrawer.submit')}
              disabled={isSubmitting || isPending}
              onClick={() => void 0}
            />
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}

function BlueprintBillCategoryField({
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
