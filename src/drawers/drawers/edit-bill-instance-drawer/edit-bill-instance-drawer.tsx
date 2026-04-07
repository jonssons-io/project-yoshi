import { Check, FileTextIcon } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  BillPaymentHandling,
  CategoryType,
  type UpdateBillInstanceRequest
} from '@/api/generated/types.gen'
import { Alert } from '@/components/alert/alert'
import { Button } from '@/components/button/button'
import {
  type ComboboxValue,
  createTranslatedZodValidator,
  safeValidateForm,
  useAppForm
} from '@/components/form'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/contexts/auth-context'
import {
  useAccountsList,
  useBillInstanceById,
  useBudgetsList,
  useCategoriesList,
  useRecipientsList,
  useUpdateBillInstance
} from '@/hooks/api'
import { getErrorMessage } from '@/lib/api-error'
import { translateIfLikelyI18nKey } from '@/lib/form-validation'
import { normalizeBackendSplits } from '@/lib/split-normalization'
import { withSplitTotalsCoercedForValidation } from '../create-bill-drawer/bill-split-form-payload'
import { mapBillSplitsToFormRows } from '../create-bill-drawer/bill-split-rows'
import type { CreateBillDrawerForm } from '../create-bill-drawer/form-api'
import { mapBillSplitFormRowsToBillSplitWrite } from '../create-bill-drawer/map-to-request'
import { SplitBillBlock } from '../create-bill-drawer/split-bill-block'
import {
  type BillSplitRowValue,
  newBillSplitRow
} from '../create-bill-drawer/types'
import {
  editBillInstanceFormSchema,
  type ParsedEditBillInstanceForm
} from './schema'

function recipientToBillInstancePatch(
  r: ParsedEditBillInstanceForm['recipient']
): Pick<UpdateBillInstanceRequest, 'recipient' | 'newRecipientName'> {
  if (r == null || r === undefined) return {}
  if (typeof r === 'string' && r.length > 0) {
    return {
      recipient: r
    }
  }
  if (typeof r === 'object' && r !== null && 'isNew' in r && r.isNew) {
    return {
      newRecipientName: r.name.trim()
    }
  }
  return {}
}

function categoryToBillInstancePatch(
  c: ParsedEditBillInstanceForm['category']
): Pick<UpdateBillInstanceRequest, 'categoryId' | 'newCategoryName'> {
  if (c == null || c === undefined) return {}
  if (typeof c === 'string' && c.length > 0) {
    return {
      categoryId: c
    }
  }
  if (typeof c === 'object' && c !== null && 'isNew' in c && c.isNew) {
    return {
      newCategoryName: c.name.trim()
    }
  }
  return {}
}

export type EditBillInstanceDrawerProps = {
  instanceId: string
  onClose: () => void
}

const EDIT_INSTANCE_DEFAULTS = {
  name: '',
  paymentHandling: '' as string,
  recipient: null as ComboboxValue | null,
  accountId: '',
  dueDate: new Date(),
  amount: null as number | null,
  budgetId: '',
  category: null as ComboboxValue | null,
  splits: [] as BillSplitRowValue[]
}

export function EditBillInstanceDrawer({
  instanceId,
  onClose
}: EditBillInstanceDrawerProps) {
  const { t } = useTranslation()
  const { userId, householdId } = useAuth()
  const [hasInitializedForm, setHasInitializedForm] = useState(false)
  const [useSplits, setUseSplits] = useState(false)
  const [expandedSplitIds, setExpandedSplitIds] = useState<
    Record<string, boolean>
  >({})
  const splitSwitchId = useId()

  const {
    data: instance,
    isPending: isInstancePending,
    isError: isInstanceError
  } = useBillInstanceById({
    instanceId,
    enabled: Boolean(instanceId)
  })

  const hadSplitsAtOpenRef = useRef(false)

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

  const { mutateAsync: updateBillInstanceAsync, isPending } =
    useUpdateBillInstance()

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
      }
    ],
    [
      t
    ]
  )

  const budgetIdForCategories = instance?.budget?.id ?? ''

  const { data: expenseCategories = [] } = useCategoriesList({
    householdId,
    userId,
    budgetId: budgetIdForCategories || undefined,
    type: CategoryType.EXPENSE,
    enabled: Boolean(householdId && budgetIdForCategories && !useSplits)
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

  const form = useAppForm({
    defaultValues: EDIT_INSTANCE_DEFAULTS,
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
      const payload: Record<string, unknown> = {
        ...value,
        splits: hasSplits ? value.splits : []
      }

      const result = safeValidateForm(
        editBillInstanceFormSchema,
        withSplitTotalsCoercedForValidation(
          payload as {
            splits?: BillSplitRowValue[]
            amount?: number | null
          }
        )
      )
      if (!result.success) {
        const msg = result.errors[0]?.message ?? 'common.error'
        toast.error(translateIfLikelyI18nKey(msg, t))
        return
      }

      if (!instance) {
        toast.error(t('bills.notFound'))
        return
      }

      try {
        if (hasSplits) {
          const splitsPayload = mapBillSplitFormRowsToBillSplitWrite(
            t,
            result.data.splits ?? []
          )
          const totalAmount = splitsPayload.reduce(
            (s, line) => s + line.amount,
            0
          )
          await updateBillInstanceAsync({
            id: instance.id,
            userId,
            name: result.data.name,
            ...recipientToBillInstancePatch(result.data.recipient),
            amount: totalAmount,
            budgetId: null,
            dueDate: result.data.dueDate,
            accountId: result.data.accountId,
            splits: splitsPayload,
            paymentHandling:
              result.data.paymentHandling === ''
                ? null
                : result.data.paymentHandling
          })
        } else {
          await updateBillInstanceAsync({
            id: instance.id,
            userId,
            name: result.data.name,
            ...recipientToBillInstancePatch(result.data.recipient),
            amount: (() => {
              const a = result.data.amount
              if (a == null) {
                throw new Error('edit bill instance: amount required')
              }
              return a
            })(),
            dueDate: result.data.dueDate,
            accountId: result.data.accountId,
            ...categoryToBillInstancePatch(result.data.category),
            paymentHandling:
              result.data.paymentHandling === ''
                ? null
                : result.data.paymentHandling
          })
        }
        toast.success(t('bills.updateSuccess'))
        onClose()
      } catch (err) {
        toast.error(getErrorMessage(err))
      }
    }
  })

  const toggleSplit = useCallback(
    (checked: boolean) => {
      setUseSplits(checked)
      if (checked) {
        const parentBudget =
          (form.getFieldValue('budgetId') as string) ||
          instance?.budget?.id ||
          ''
        const row = newBillSplitRow()
        if (parentBudget.length > 0) {
          row.budgetId = parentBudget
        }
        form.setFieldValue('splits', [
          row
        ])
        form.setFieldValue('amount', null)
        form.setFieldValue('category', null)
        setExpandedSplitIds({
          [row.id]: true
        })
      } else {
        form.setFieldValue('splits', [])
      }
    },
    [
      form,
      instance?.budget?.id
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset when switching instance
  useEffect(() => {
    setHasInitializedForm(false)
    hadSplitsAtOpenRef.current = false
  }, [
    instanceId
  ])

  useEffect(() => {
    if (!instance || hasInitializedForm) return

    const normalized = normalizeBackendSplits(instance.splits)

    form.setFieldValue('name', instance.name)
    form.setFieldValue('paymentHandling', instance.paymentHandling ?? '')
    form.setFieldValue('recipient', instance.recipient.id)
    form.setFieldValue('accountId', instance.account?.id ?? '')
    form.setFieldValue('dueDate', instance.dueDate)
    form.setFieldValue('budgetId', instance.budget?.id ?? '')

    hadSplitsAtOpenRef.current = Boolean(normalized && normalized.length > 0)

    if (normalized && normalized.length > 0) {
      setUseSplits(true)
      const rows = mapBillSplitsToFormRows(normalized, {
        defaultBudgetId: instance.budget?.id
      })
      form.setFieldValue('splits', rows)
      form.setFieldValue(
        'amount',
        normalized.reduce((s, x) => s + x.amount, 0)
      )
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
      form.setFieldValue('amount', instance.amount)
      form.setFieldValue(
        'category',
        instance.category?.id ?? instance.splits?.[0]?.categoryId ?? null
      )
      setExpandedSplitIds({})
    }

    setHasInitializedForm(true)
  }, [
    instance,
    form,
    hasInitializedForm
  ])

  const nameValidator = useMemo(
    () =>
      createTranslatedZodValidator(editBillInstanceFormSchema.shape.name, t),
    [
      t
    ]
  )
  const accountValidator = useMemo(
    () =>
      createTranslatedZodValidator(
        editBillInstanceFormSchema.shape.accountId,
        t
      ),
    [
      t
    ]
  )
  const dueDateValidator = useMemo(
    () =>
      createTranslatedZodValidator(editBillInstanceFormSchema.shape.dueDate, t),
    [
      t
    ]
  )
  const amountWhenNotSplitValidator = useMemo(
    () =>
      ({ value }: { value: unknown }) => {
        const n = value as number | null
        if (n == null || n <= 0) return t('validation.positive')
        return undefined
      },
    [
      t
    ]
  )

  if (isInstancePending || (!hasInitializedForm && !isInstanceError)) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="type-body text-gray-800">{t('common.loading')}</p>
      </div>
    )
  }

  if (isInstanceError || !instance) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="type-body text-gray-800">{t('bills.notFound')}</p>
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
        <Alert variant="info">
          <span className="font-medium">
            {t('bills.editInstanceDrawer.scopeNotice')}
          </span>
        </Alert>

        <form.AppField
          name="name"
          validators={{
            onChange: nameValidator
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
            onChange: ({ value }) => {
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
            }
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
            onChange: accountValidator
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
            onChange: dueDateValidator
          }}
        >
          {(field) => (
            <field.DateField
              label={t('common.date')}
              labelHelpText={t('bills.editInstanceDrawer.dueDateHelp')}
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
                onChange: (opts) => {
                  const splitRows = form.getFieldValue('splits') as
                    | BillSplitRowValue[]
                    | undefined
                  if ((splitRows?.length ?? 0) > 0) return undefined
                  return amountWhenNotSplitValidator(opts)
                }
              }}
            >
              {(field) => (
                <field.NumberField
                  label={t('common.amount')}
                  placeholder={t('forms.zeroPlaceholder')}
                  min={0}
                  unit="SEK"
                />
              )}
            </form.AppField>

            <form.AppField name="budgetId">
              {(field) => (
                <field.SelectField
                  label={t('allocation.drawer.budget')}
                  placeholder={t('forms.selectBudget')}
                  options={budgetOptions}
                  disabled
                  labelHelpText={t(
                    'bills.editInstanceDrawer.budgetReadOnlyHelp'
                  )}
                />
              )}
            </form.AppField>

            <form.AppField name="category">
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
              icon={<Check aria-hidden={true} />}
              label={t('bills.editInstanceDrawer.submit')}
              disabled={isSubmitting || isPending}
              onClick={() => void 0}
            />
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}
