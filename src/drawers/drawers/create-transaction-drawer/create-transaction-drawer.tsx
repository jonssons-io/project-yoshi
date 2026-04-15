import { PlusIcon } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { TransactionType } from '@/api/generated/types.gen'
import { Button } from '@/components/button/button'
import { useAppForm } from '@/components/form'
import { TransactionTypeSegmentedControl } from '@/components/transaction-type-segmented-control/transaction-type-segmented-control'
import { useAuth } from '@/contexts/auth-context'
import {
  useAccountBalancesList,
  useAccountsList,
  useBudgetsList,
  useCreateTransaction,
  useIncomeSourcesList,
  useRecipientsList
} from '@/hooks/api'
import { getErrorMessage } from '@/lib/api-error'
import { accountsById } from '@/lib/accounts'
import {
  applyZodIssuesToTanStackForm,
  clearTanStackFieldErrors,
  translateIfLikelyI18nKey
} from '@/lib/form-validation'
import { formatCurrency } from '@/lib/utils'

import { ExpenseIncomeTransferFields } from './expense-income-transfer-fields'
import { buildCreateTransactionBody } from './map-to-request'
import { drawerFormSchema } from './schema'
import {
  DRAWER_DEFAULT_VALUES,
  type DrawerFormValues,
  newSplitRow,
  type SplitRowValue
} from './types'

export type IncomeInstancePrefill = {
  instanceId: string
  name: string
  amount: number
  date: Date
  accountId: string
  categoryId: string | null
  senderName: string
}

export type BillInstanceSplitPrefill = {
  subtitle: string
  amount: number
  budgetId: string | null
  categoryId: string
}

export type BillInstancePrefill = {
  instanceId: string
  name: string
  amount: number
  date: Date
  accountId: string | null
  categoryId: string | null
  budgetId: string | null
  recipientId: string
  splits?: BillInstanceSplitPrefill[]
}

export type CreateTransactionDrawerProps = {
  onClose: () => void
  incomeInstance?: IncomeInstancePrefill
  billInstance?: BillInstancePrefill
}

export function CreateTransactionDrawer({
  onClose,
  incomeInstance,
  billInstance
}: CreateTransactionDrawerProps) {
  const { t } = useTranslation()
  const { userId, householdId } = useAuth()
  const [useSplits, setUseSplits] = useState(
    () => (billInstance?.splits?.length ?? 0) > 0
  )
  const [expandedSplitIds, setExpandedSplitIds] = useState<
    Record<string, boolean>
  >({})
  const splitSwitchId = useId()

  const isInstanceLinked = !!incomeInstance || !!billInstance

  const { mutate: createTransaction, isPending } = useCreateTransaction()

  const { data: accountBalances = [] } = useAccountBalancesList({
    householdId,
    userId,
    enabled: Boolean(householdId),
    includeArchived: false
  })

  const { data: accountsForLabels = [] } = useAccountsList({
    householdId,
    userId,
    enabled: Boolean(householdId),
    excludeArchived: false
  })

  const accountLabelById = useMemo(
    () => accountsById(accountsForLabels),
    [
      accountsForLabels
    ]
  )

  const { data: budgets = [] } = useBudgetsList({
    householdId,
    userId,
    enabled: !!householdId
  })

  const { data: recipients = [] } = useRecipientsList({
    householdId,
    userId,
    enabled: !!householdId
  })

  const { data: incomeSources = [] } = useIncomeSourcesList({
    householdId,
    userId,
    enabled: !!householdId
  })

  const senderOptions = useMemo(
    () =>
      incomeSources
        .filter((s) => !s.archived)
        .map((s) => ({
          value: s.id,
          label: s.name
        })),
    [
      incomeSources
    ]
  )

  const defaultValues = useMemo<DrawerFormValues>(() => {
    if (incomeInstance) {
      return {
        ...DRAWER_DEFAULT_VALUES,
        transactionType: TransactionType.INCOME,
        name: incomeInstance.name,
        amount: incomeInstance.amount,
        date: incomeInstance.date,
        accountId: incomeInstance.accountId,
        category: incomeInstance.categoryId
      }
    }
    if (billInstance) {
      const splitLines = billInstance.splits
      if (splitLines && splitLines.length > 0) {
        return {
          ...DRAWER_DEFAULT_VALUES,
          transactionType: TransactionType.EXPENSE,
          name: billInstance.name,
          amount: 0,
          date: billInstance.date,
          accountId: billInstance.accountId ?? '',
          category: null,
          budgetId: '',
          recipient: billInstance.recipientId,
          splits: splitLines.map((s) => ({
            id: crypto.randomUUID(),
            subtitle: s.subtitle,
            amount: s.amount,
            budgetId: s.budgetId ?? billInstance.budgetId ?? '',
            category: s.categoryId || null
          }))
        }
      }
      return {
        ...DRAWER_DEFAULT_VALUES,
        transactionType: TransactionType.EXPENSE,
        name: billInstance.name,
        amount: billInstance.amount,
        date: billInstance.date,
        accountId: billInstance.accountId ?? '',
        category: billInstance.categoryId,
        budgetId: billInstance.budgetId ?? '',
        recipient: billInstance.recipientId
      }
    }
    return DRAWER_DEFAULT_VALUES
  }, [
    incomeInstance,
    billInstance
  ])

  const form = useAppForm({
    defaultValues,
    canSubmitWhenInvalid: true,
    onSubmitInvalid: ({ formApi }) => {
      for (const meta of Object.values(formApi.state.fieldMeta)) {
        const m = meta as {
          errors?: string[]
        }
        const first = m?.errors?.[0]
        if (first) {
          toast.error(translateIfLikelyI18nKey(first, t))
          return
        }
      }
    },
    onSubmit: async ({ value, formApi }) => {
      const hasSplits =
        value.transactionType === TransactionType.EXPENSE &&
        useSplits &&
        value.splits.length > 0

      const payload: DrawerFormValues = {
        ...value,
        splits: hasSplits ? value.splits : []
      }

      const splitCount = payload.splits?.length ?? 0
      const keysToReset = [
        'name',
        'date',
        'amount',
        'accountId',
        'transferToAccountId',
        'budgetId',
        'category',
        'recipient',
        'sender'
      ]
      for (let i = 0; i < splitCount; i++) {
        keysToReset.push(
          `splits[${i}].subtitle`,
          `splits[${i}].amount`,
          `splits[${i}].budgetId`,
          `splits[${i}].category`
        )
      }
      clearTanStackFieldErrors(formApi, keysToReset)

      const zodResult = drawerFormSchema.safeParse(payload)
      if (!zodResult.success) {
        applyZodIssuesToTanStackForm(formApi, zodResult.error.issues, (m) =>
          translateIfLikelyI18nKey(m, t)
        )
        const splitIdx = new Set<number>()
        for (const issue of zodResult.error.issues) {
          if (issue.path[0] === 'splits' && typeof issue.path[1] === 'number') {
            splitIdx.add(issue.path[1])
          }
        }
        if (splitIdx.size > 0 && payload.splits?.length) {
          setExpandedSplitIds((m) => {
            const next = {
              ...m
            }
            for (const i of splitIdx) {
              const row = payload.splits[i]
              if (row) {
                next[row.id] = true
              }
            }
            return next
          })
        }
        return
      }

      if (!householdId) {
        toast.error(t('server.badRequest.missingHouseholdId'))
        return
      }

      const data = zodResult.data
      let body: ReturnType<typeof buildCreateTransactionBody>
      try {
        body = buildCreateTransactionBody({
          t,
          data,
          hasSplits,
          instanceId: incomeInstance?.instanceId ?? billInstance?.instanceId
        })
      } catch (err) {
        toast.error(getErrorMessage(err))
        return
      }

      createTransaction(
        {
          userId,
          ...body
        },
        {
          onSuccess: () => {
            toast.success(t('transactions.createSuccess'))
            onClose()
          },
          onError: (err) => {
            toast.error(getErrorMessage(err))
          }
        }
      )
    }
  })

  useEffect(() => {
    if (!billInstance?.splits?.length) return
    const timeoutId = window.setTimeout(() => {
      const splits = form.getFieldValue('splits') as SplitRowValue[] | undefined
      if (splits?.length) {
        setExpandedSplitIds(
          Object.fromEntries(
            splits.map((r) => [
              r.id,
              true
            ])
          )
        )
      }
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [
    billInstance,
    form
  ])

  const senderPrefilled = useRef(false)
  useEffect(() => {
    if (!incomeInstance?.senderName || senderPrefilled.current) return
    if (incomeSources.length === 0) return
    senderPrefilled.current = true
    const match = incomeSources.find(
      (s) => s.name.toLowerCase() === incomeInstance.senderName.toLowerCase()
    )
    if (match) {
      form.setFieldValue('sender', match.id)
    }
  }, [
    incomeInstance,
    incomeSources,
    form
  ])

  const typeOptions = useMemo(
    () => [
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
    ],
    [
      t
    ]
  )

  const accountOptions = useMemo(
    () =>
      accountBalances.map((b) => {
        const displayName =
          accountLabelById.get(b.account.id) ??
          (b.account.name?.trim() || t('common.account'))
        return {
          value: b.account.id,
          label: `${displayName}: ${formatCurrency(b.currentBalance)} SEK`
        }
      }),
    [
      accountBalances,
      accountLabelById,
      t
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

  const handleTypeChange = useCallback(
    (next: TransactionType) => {
      form.setFieldValue('transferToAccountId', '')
      form.setFieldValue('category', null)
      if (next !== TransactionType.EXPENSE) {
        setUseSplits(false)
        form.setFieldValue('splits', [])
        form.setFieldValue('budgetId', '')
      }
      if (next === TransactionType.TRANSFER) {
        form.setFieldValue('recipient', null)
        form.setFieldValue('sender', null)
      }
      if (next === TransactionType.EXPENSE) {
        form.setFieldValue('sender', null)
      }
      if (next === TransactionType.INCOME) {
        form.setFieldValue('recipient', null)
      }
    },
    [
      form
    ]
  )

  const toggleSplit = useCallback(
    (checked: boolean) => {
      setUseSplits(checked)
      if (checked) {
        const parentBudget = form.getFieldValue('budgetId') as string
        const row = newSplitRow()
        if (typeof parentBudget === 'string' && parentBudget.length > 0) {
          row.budgetId = parentBudget
        }
        form.setFieldValue('splits', [
          row
        ])
        form.setFieldValue('amount', 0)
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
    const prev = form.getFieldValue('splits') as SplitRowValue[] | undefined
    const template = prev?.[prev.length - 1]?.budgetId ?? ''
    const row = newSplitRow()
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
        {!isInstanceLinked && (
          <form.AppField name="transactionType">
            {(field) => (
              <TransactionTypeSegmentedControl
                value={field.state.value}
                onChange={(v) => {
                  field.handleChange(v)
                  handleTypeChange(v)
                }}
                options={typeOptions}
              />
            )}
          </form.AppField>
        )}

        <form.Subscribe
          selector={(s) => ({
            transactionType: s.values.transactionType,
            accountId: s.values.accountId,
            budgetId: s.values.budgetId
          })}
        >
          {({ transactionType, accountId, budgetId }) => (
            <ExpenseIncomeTransferFields
              form={form}
              transactionType={transactionType}
              accountId={accountId}
              budgetId={budgetId}
              householdId={householdId ?? ''}
              splitSwitchId={splitSwitchId}
              userId={userId}
              useSplits={useSplits}
              onToggleSplit={toggleSplit}
              accountOptions={accountOptions}
              budgetOptions={budgetOptions}
              recipientOptions={recipientOptions}
              senderOptions={senderOptions}
              expandedSplitIds={expandedSplitIds}
              setExpandedSplitIds={setExpandedSplitIds}
              addSplit={addSplit}
              removeSplit={removeSplit}
              turnOffSplits={turnOffSplits}
            />
          )}
        </form.Subscribe>
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
              label={t('transactions.createTransaction')}
              disabled={isSubmitting || isPending}
              onClick={() => void 0}
            />
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}
