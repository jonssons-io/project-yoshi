import { Check } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { type Transaction, TransactionType } from '@/api/generated/types.gen'
import { Alert } from '@/components/alert/alert'
import { Button } from '@/components/button/button'
import { useAppForm } from '@/components/form'
import { useAuth } from '@/contexts/auth-context'
import {
  useAccountBalancesList,
  useBudgetsList,
  useCategoryById,
  useIncomeSourcesList,
  useRecipientsList,
  useTransactionById,
  useUpdateTransaction
} from '@/hooks/api'
import { getErrorMessage } from '@/lib/api-error'
import {
  applyZodIssuesToTanStackForm,
  clearTanStackFieldErrors,
  translateIfLikelyI18nKey
} from '@/lib/form-validation'
import { formatCurrency } from '@/lib/utils'

import { ExpenseIncomeTransferFields } from '../create-transaction-drawer/expense-income-transfer-fields'
import { drawerFormSchema } from '../create-transaction-drawer/schema'
import {
  DRAWER_DEFAULT_VALUES,
  type DrawerFormValues,
  newSplitRow,
  type SplitRowValue
} from '../create-transaction-drawer/types'
import { buildUpdateTransactionBody } from './map-to-update-request'

export type EditTransactionDrawerProps = {
  transactionId: string
  onClose: () => void
}

type TransactionWithUiDate = Omit<Transaction, 'date'> & {
  date: Date
}

function transactionToFormValues(tx: TransactionWithUiDate): DrawerFormValues {
  const base: DrawerFormValues = {
    ...DRAWER_DEFAULT_VALUES,
    transactionType: tx.type,
    date: tx.date,
    accountId: tx.account.id
  }

  if (tx.type === TransactionType.TRANSFER) {
    return {
      ...base,
      name: tx.name,
      amount: tx.amount,
      transferToAccountId: tx.transferToAccount?.id ?? '',
      recipient: null,
      sender: null,
      budgetId: '',
      category: null,
      splits: []
    }
  }

  if (tx.type === TransactionType.INCOME) {
    return {
      ...base,
      name: tx.name,
      amount: tx.amount,
      category: tx.category?.id ?? null,
      sender: tx.incomeSource?.id ?? null,
      transferToAccountId: '',
      budgetId: '',
      recipient: null,
      splits: []
    }
  }

  const splitLines = tx.splits
  if (splitLines && splitLines.length > 0) {
    return {
      ...base,
      name: tx.name,
      amount: 0,
      budgetId: '',
      category: null,
      recipient: tx.recipient?.id ?? null,
      sender: null,
      transferToAccountId: '',
      splits: splitLines.map((s) => ({
        id: s.id,
        subtitle: s.subtitle ?? '',
        amount: s.amount,
        budgetId: s.budgetId ?? s.budget?.id ?? '',
        category: s.categoryId ?? s.category?.id ?? null
      }))
    }
  }

  return {
    ...base,
    name: tx.name,
    amount: tx.amount,
    budgetId: tx.budget?.id ?? '',
    category: tx.category?.id ?? null,
    recipient: tx.recipient?.id ?? null,
    sender: null,
    transferToAccountId: '',
    splits: []
  }
}

export function EditTransactionDrawer({
  transactionId,
  onClose
}: EditTransactionDrawerProps) {
  const { t } = useTranslation()
  const { userId, householdId } = useAuth()
  const [hasInitializedForm, setHasInitializedForm] = useState(false)
  const [useSplits, setUseSplits] = useState(false)
  const [expandedSplitIds, setExpandedSplitIds] = useState<
    Record<string, boolean>
  >({})
  const splitSwitchId = useId()
  const loadedTypeRef = useRef<TransactionType | null>(null)
  const expenseBudgetHydrationDoneRef = useRef(false)

  const {
    data: transaction,
    isPending: isTransactionPending,
    isError: isTransactionError
  } = useTransactionById({
    transactionId,
    enabled: Boolean(transactionId)
  })

  const { mutate: updateTransaction, isPending } = useUpdateTransaction()

  const { data: accountBalances = [], isFetched: accountBalancesFetched } =
    useAccountBalancesList({
      householdId,
      userId,
      enabled: Boolean(householdId),
      /** Editing older rows may use archived accounts; options must include them for Select pre-fill. */
      includeArchived: true
    })

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

  const expenseCategoryIdForBudgetHydration = useMemo(() => {
    if (!transaction) return null
    if (transaction.type !== TransactionType.EXPENSE) return null
    if ((transaction.splits?.length ?? 0) > 0) return null
    if (transaction.budget?.id) return null
    return transaction.category?.id ?? null
  }, [transaction])

  const { data: categoryDetailForBudget } = useCategoryById({
    categoryId: expenseCategoryIdForBudgetHydration,
    userId,
    enabled: Boolean(expenseCategoryIdForBudgetHydration)
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

  const form = useAppForm({
    defaultValues: DRAWER_DEFAULT_VALUES,
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

      if (!transaction) return

      const instanceId =
        transaction.billInstance?.id ?? transaction.incomeInstance?.id ?? null

      let body: ReturnType<typeof buildUpdateTransactionBody>
      try {
        body = buildUpdateTransactionBody({
          t,
          data: zodResult.data,
          hasSplits,
          instanceId
        })
      } catch (err) {
        toast.error(translateIfLikelyI18nKey(getErrorMessage(err), t))
        return
      }

      updateTransaction(
        {
          id: transactionId,
          userId,
          date: zodResult.data.date,
          ...body
        },
        {
          onSuccess: () => {
            const kind = loadedTypeRef.current
            toast.success(
              kind === TransactionType.TRANSFER
                ? t('transfers.updateSuccess')
                : t('transactions.updateSuccess')
            )
            onClose()
          },
          onError: (err) => {
            toast.error(getErrorMessage(err))
          }
        }
      )
    }
  })

  // biome-ignore lint/correctness/useExhaustiveDependencies: props.transactionId drives reset when opening another row
  useEffect(() => {
    setHasInitializedForm(false)
    loadedTypeRef.current = null
    expenseBudgetHydrationDoneRef.current = false
  }, [
    transactionId
  ])

  // biome-ignore lint/correctness/useExhaustiveDependencies: load-once when GET transaction resolves
  useEffect(() => {
    if (!transaction || hasInitializedForm) return
    if (householdId && !accountBalancesFetched) return

    const v = transactionToFormValues(transaction)
    form.setFieldValue('transactionType', v.transactionType)
    form.setFieldValue('name', v.name)
    form.setFieldValue('date', v.date)
    form.setFieldValue('amount', v.amount)
    form.setFieldValue('accountId', v.accountId)
    form.setFieldValue('transferToAccountId', v.transferToAccountId)
    form.setFieldValue('recipient', v.recipient)
    form.setFieldValue('sender', v.sender)
    form.setFieldValue('budgetId', v.budgetId)
    form.setFieldValue('category', v.category)
    form.setFieldValue('splits', v.splits)

    const hadSplits = (transaction.splits?.length ?? 0) > 0
    setUseSplits(hadSplits)
    loadedTypeRef.current = transaction.type

    if (hadSplits && v.splits.length > 0) {
      setExpandedSplitIds(
        Object.fromEntries(
          v.splits.map((r) => [
            r.id,
            true
          ])
        )
      )
    } else {
      setExpandedSplitIds({})
    }

    setHasInitializedForm(true)
  }, [
    transaction,
    hasInitializedForm,
    householdId,
    accountBalancesFetched
  ])

  /**
   * Some API responses include the expense category but omit the top-level `budget` relation.
   * Category detail lists linked budgets; hydrate `budgetId` so category options load and PATCH validation passes.
   */
  useEffect(() => {
    if (!hasInitializedForm) return
    if (!expenseCategoryIdForBudgetHydration) return
    if (categoryDetailForBudget?.id !== expenseCategoryIdForBudgetHydration) {
      return
    }
    if (expenseBudgetHydrationDoneRef.current) return
    const linked = categoryDetailForBudget?.budgets
    if (!linked?.length) return
    const derivedBudgetId = linked[0]?.id
    if (!derivedBudgetId) return
    const current = form.getFieldValue('budgetId') as string
    if (current) {
      expenseBudgetHydrationDoneRef.current = true
      return
    }
    form.setFieldValue('budgetId', derivedBudgetId)
    expenseBudgetHydrationDoneRef.current = true
  }, [
    categoryDetailForBudget,
    expenseCategoryIdForBudgetHydration,
    hasInitializedForm,
    form
  ])

  const accountOptions = useMemo(
    () =>
      accountBalances.map((b) => {
        const name = b.account.name?.trim() || t('common.account')
        return {
          value: b.account.id,
          label: `${name}: ${formatCurrency(b.currentBalance)} SEK`
        }
      }),
    [
      accountBalances,
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
    const splits = form.getFieldValue('splits') as SplitRowValue[]
    const total = splits.reduce((s, r) => s + (r.amount ?? 0), 0)
    setUseSplits(false)
    form.setFieldValue('splits', [])
    setExpandedSplitIds({})
    if (total > 0) {
      form.setFieldValue('amount', total)
    }
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

  if (isTransactionError) {
    return (
      <Alert variant="error">
        <span className="font-medium">{t('transactions.notFound')}</span>
      </Alert>
    )
  }

  const waitingForAccountOptions = Boolean(
    householdId && transaction && !accountBalancesFetched
  )

  if ((isTransactionPending && !transaction) || waitingForAccountOptions) {
    return (
      <p className="type-body-medium text-gray-600">
        {t('transactions.loadingArgs')}
      </p>
    )
  }

  if (!transaction) {
    return null
  }

  const submitLabel =
    transaction.type === TransactionType.TRANSFER
      ? t('transfers.update')
      : t('transactions.update')

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
              icon={<Check aria-hidden />}
              label={submitLabel}
              disabled={isSubmitting || isPending || !hasInitializedForm}
              onClick={() => void 0}
            />
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}
