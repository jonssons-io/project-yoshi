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
  useAccountsList,
  useBudgetsList,
  useCreateTransaction,
  useIncomeSourcesList,
  useRecipientsList
} from '@/hooks/api'
import { getErrorMessage } from '@/lib/api-error'
import {
  safeValidateForm,
  translateIfLikelyI18nKey
} from '@/lib/form-validation'

import { ExpenseIncomeTransferFields } from './expense-income-transfer-fields'
import { buildCreateTransactionBody } from './map-to-request'
import { drawerFormSchema } from './schema'
import {
  DRAWER_DEFAULT_VALUES,
  type DrawerFormValues,
  newSplitRow
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

export type CreateTransactionDrawerProps = {
  onClose: () => void
  incomeInstance?: IncomeInstancePrefill
}

export function CreateTransactionDrawer({
  onClose,
  incomeInstance
}: CreateTransactionDrawerProps) {
  const { t } = useTranslation()
  const { userId, householdId } = useAuth()
  const [useSplits, setUseSplits] = useState(false)
  const [expandedSplitIds, setExpandedSplitIds] = useState<
    Record<string, boolean>
  >({})
  const splitSwitchId = useId()

  const isIncomeLinked = !!incomeInstance

  const { mutate: createTransaction, isPending } = useCreateTransaction()

  const { data: accounts = [] } = useAccountsList({
    householdId,
    userId,
    enabled: !!householdId,
    excludeArchived: true
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

  const senderOptions = useMemo(
    () =>
      incomeSources
        .filter((s) => !s.archived)
        .map((s) => ({
          value: s.id,
          label: s.name
        })),
    [incomeSources]
  )

  const defaultValues = useMemo<DrawerFormValues>(() => {
    if (!incomeInstance) return DRAWER_DEFAULT_VALUES
    return {
      ...DRAWER_DEFAULT_VALUES,
      transactionType: TransactionType.INCOME,
      name: incomeInstance.name,
      amount: incomeInstance.amount,
      date: incomeInstance.date,
      accountId: incomeInstance.accountId,
      category: incomeInstance.categoryId
    }
  }, [incomeInstance])

  const form = useAppForm({
    defaultValues,
    canSubmitWhenInvalid: true,
    onSubmit: async ({ value }) => {
      const hasSplits =
        value.transactionType === TransactionType.EXPENSE &&
        useSplits &&
        value.splits.length > 0

      const payload: DrawerFormValues = {
        ...value,
        splits: hasSplits ? value.splits : []
      }

      const parsed = safeValidateForm(drawerFormSchema, payload)
      if (!parsed.success) {
        const msg = parsed.errors[0]?.message ?? 'common.error'
        toast.error(translateIfLikelyI18nKey(msg, t))
        return
      }

      const data = parsed.data
      const body = buildCreateTransactionBody({
        t,
        data,
        hasSplits,
        instanceId: incomeInstance?.instanceId
      })

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
  }, [incomeInstance, incomeSources, form])

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
        const row = newSplitRow()
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
    const row = newSplitRow()
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
        {!isIncomeLinked && (
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
              householdId={householdId}
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
