import { Check, FileTextIcon } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  BillPaymentHandling,
  BlueprintUpdateScope,
  type BillSplit,
  CategoryType
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
import type { CreateBillDrawerForm } from '../create-bill-drawer/form-api'
import { SplitBillBlock } from '../create-bill-drawer/split-bill-block'
import {
  type BillSplitRowValue,
  newBillSplitRow
} from '../create-bill-drawer/types'
import {
  editBillInstanceFormSchema,
  type ParsedEditBillInstanceForm
} from './schema'

export type EditBillInstanceDrawerProps = {
  instanceId: string
  onClose: () => void
}

const PAYMENT_HANDLING_LABEL_KEY: Record<
  BillPaymentHandling,
  | 'bills.paymentHandling.AUTOGIRO'
  | 'bills.paymentHandling.E_INVOICE'
  | 'bills.paymentHandling.MAIL'
  | 'bills.paymentHandling.PORTAL'
  | 'bills.paymentHandling.PAPER'
> = {
  [BillPaymentHandling.AUTOGIRO]: 'bills.paymentHandling.AUTOGIRO',
  [BillPaymentHandling.E_INVOICE]: 'bills.paymentHandling.E_INVOICE',
  [BillPaymentHandling.MAIL]: 'bills.paymentHandling.MAIL',
  [BillPaymentHandling.PORTAL]: 'bills.paymentHandling.PORTAL',
  [BillPaymentHandling.PAPER]: 'bills.paymentHandling.PAPER'
}

const EDIT_INSTANCE_DEFAULTS = {
  name: '',
  recipient: null as ComboboxValue | null,
  accountId: '',
  dueDate: new Date(),
  amount: 0,
  budgetId: '',
  category: null as ComboboxValue | null,
  splits: [] as BillSplitRowValue[]
}

function billSplitsToFormRows(splits: BillSplit[]): BillSplitRowValue[] {
  return splits.map((s) => ({
    id: s.id,
    subtitle: s.subtitle ?? '',
    amount: s.amount,
    category: s.categoryId
  }))
}

function topLevelCategoryId(
  c: ParsedEditBillInstanceForm['category']
): string | undefined {
  if (typeof c === 'string' && c.length > 0) return c
  return undefined
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
    onSubmit: async ({ value }) => {
      const hasSplits = useSplits && (value.splits?.length ?? 0) > 0
      const payload: Record<string, unknown> = {
        ...value,
        splits: hasSplits ? value.splits : []
      }

      const result = safeValidateForm(editBillInstanceFormSchema, payload)
      if (!result.success) {
        const msg = result.errors[0]?.message ?? 'common.error'
        toast.error(translateIfLikelyI18nKey(msg, t))
        return
      }

      if (!instance) {
        toast.error(t('bills.notFound'))
        return
      }

      const recipient = result.data.recipient
      if (typeof recipient !== 'string' || recipient.length === 0) {
        toast.error(t('validation.recipientRequired'))
        return
      }

      const catId = topLevelCategoryId(result.data.category)

      try {
        await updateBillInstanceAsync({
          id: instance.id,
          userId,
          updateType: BlueprintUpdateScope.INSTANCE,
          name: result.data.name,
          recipient,
          amount: hasSplits
            ? (result.data.splits ?? []).reduce((s, r) => s + r.amount, 0)
            : result.data.amount,
          dueDate: result.data.dueDate,
          accountId: result.data.accountId,
          ...(!hasSplits && catId ? { categoryId: catId } : {})
        })
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
        const row = newBillSplitRow()
        form.setFieldValue('splits', [
          row
        ])
        form.setFieldValue('amount', 0)
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
    const row = newBillSplitRow()
    form.setFieldValue('splits', (prev) => [
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
    form.setFieldValue('recipient', instance.recipient.id)
    form.setFieldValue('accountId', instance.account?.id ?? '')
    form.setFieldValue('dueDate', instance.dueDate)
    form.setFieldValue('budgetId', instance.budget?.id ?? '')

    hadSplitsAtOpenRef.current = Boolean(normalized && normalized.length > 0)

    if (normalized && normalized.length > 0) {
      setUseSplits(true)
      const rows = billSplitsToFormRows(normalized)
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
        const n = value as number
        if (n <= 0) return t('validation.positive')
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

        {instance.paymentHandling ? (
          <p className="type-caption text-muted-foreground">
            {t('bills.editInstanceDrawer.handlingWithValue', {
              value: t(PAYMENT_HANDLING_LABEL_KEY[instance.paymentHandling])
            })}
          </p>
        ) : null}

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
                onChange: amountWhenNotSplitValidator
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
