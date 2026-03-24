/**
 * Transactions page — income, expense, and transfer transactions
 */

import { createFileRoute } from '@tanstack/react-router'
import { format } from 'date-fns'
import { PlusIcon, Scale, TrendingDown, TrendingUp } from 'lucide-react'
import { type ReactNode, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { TransactionType } from '@/api/generated/types.gen'
import { Button } from '@/components/button/button'
import { PageDataTable } from '@/components/page-data-table/page-data-table'
import { PageLayout } from '@/components/page-layout/page-layout'
import { useAuth } from '@/contexts/auth-context'
import {
  useAccountsList,
  useCloneTransaction,
  useDeleteTransaction,
  useTransactionsList
} from '@/hooks/api'
import { useConfirmDialog } from '@/hooks/use-confirm-dialog'
import { getErrorMessage } from '@/lib/api-error'
import { formatCurrency } from '@/lib/utils'
import {
  type TransactionListItem,
  TransactionsTable
} from './-components/transactions-table'

const transactionsSearchSchema = z.object({
  budgetId: z.string().optional(),
  createFromBill: z.string().optional()
})

export const Route = createFileRoute('/_authenticated/transactions/')({
  component: TransactionsPage,
  validateSearch: (search) => transactionsSearchSchema.parse(search)
})

const ALL_BUDGETS_VALUE = '__all_budgets__'

function getTransactionType(
  transaction: Pick<TransactionListItem, 'type'>
): TransactionType {
  return transaction.type
}

function accountLineForSearch(transaction: TransactionListItem): string {
  if (transaction.type === TransactionType.TRANSFER) {
    return `${transaction.account?.name ?? ''} ${transaction.transferToAccount?.name ?? ''}`
  }
  return transaction.account?.name ?? ''
}

function transactionSearchBlob(
  transaction: TransactionListItem,
  t: (k: string) => string
): string {
  const type = getTransactionType(transaction)
  const typeLabel =
    type === TransactionType.INCOME
      ? t('transactions.income')
      : type === TransactionType.EXPENSE
        ? t('transactions.expense')
        : t('common.transfer')
  return [
    format(transaction.date, 'yyyy-MM-dd'),
    transaction.name,
    typeLabel,
    String(transaction.amount),
    formatCurrency(transaction.amount),
    accountLineForSearch(transaction),
    transaction.budget?.name ?? '',
    transaction.category?.name ?? '',
    transaction.recipient?.name ?? ''
  ]
    .join(' ')
    .toLowerCase()
}

function TransactionsPage() {
  const { budgetId: urlBudgetId } = Route.useSearch()
  const { userId, householdId } = useAuth()
  const { confirm, confirmDialog } = useConfirmDialog()
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const budgetFilter = urlBudgetId ?? ALL_BUDGETS_VALUE
  const budgetId = budgetFilter === ALL_BUDGETS_VALUE ? undefined : budgetFilter

  const openCreateTransactionDrawer = useCallback(() => {
    void 0
  }, [])

  const {
    data: transactions,
    isLoading,
    refetch
  } = useTransactionsList({
    householdId,
    budgetId,
    userId,
    enabled: !!householdId
  })

  const { data: accounts } = useAccountsList({
    householdId,
    userId,
    budgetId,
    enabled: !!householdId,
    excludeArchived: true
  })

  const { mutate: deleteTransaction } = useDeleteTransaction({
    onSuccess: () => {
      refetch()
      toast.success(t('transactions.deleteSuccess'))
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    }
  })

  const { mutate: cloneTransaction } = useCloneTransaction({
    onSuccess: () => {
      refetch()
      toast.success(t('transactions.cloneSuccess'))
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    }
  })

  const handleEditTransaction = () => {
    void 0
  }

  const handleEditTransfer = () => {
    void 0
  }

  const handleDeleteTransaction = useCallback(
    (transaction: TransactionListItem) => {
      confirm({
        description: t('transactions.deleteConfirm', {
          name: transaction.name
        }),
        confirmText: t('common.delete')
      }).then((isConfirmed) => {
        if (!isConfirmed) return
        deleteTransaction({
          id: transaction.id,
          userId
        })
      })
    },
    [
      confirm,
      deleteTransaction,
      t,
      userId
    ]
  )

  const handleDeleteTransfer = useCallback(
    (transaction: TransactionListItem) => {
      confirm({
        description: t('transfers.deleteConfirm'),
        confirmText: t('common.delete')
      }).then((isConfirmed) => {
        if (!isConfirmed) return
        deleteTransaction({
          id: transaction.id,
          userId
        })
      })
    },
    [
      confirm,
      deleteTransaction,
      t,
      userId
    ]
  )

  const handleClone = useCallback(
    (transaction: TransactionListItem) => {
      confirm({
        description: t('transactions.cloneConfirm', {
          name: transaction.name
        }),
        confirmText: t('common.clone')
      }).then((isConfirmed) => {
        if (!isConfirmed) return
        cloneTransaction({
          id: transaction.id,
          userId
        })
      })
    },
    [
      cloneTransaction,
      confirm,
      t,
      userId
    ]
  )

  const incomeTransactions = useMemo(
    () =>
      transactions?.filter(
        (transaction) =>
          getTransactionType(transaction) === TransactionType.INCOME
      ) ?? [],
    [
      transactions
    ]
  )

  const expenseTransactions = useMemo(
    () =>
      transactions?.filter(
        (transaction) =>
          getTransactionType(transaction) === TransactionType.EXPENSE
      ) ?? [],
    [
      transactions
    ]
  )

  const totalInitialBalance =
    accounts?.reduce((sum, a) => sum + a.initialBalance, 0) ?? 0
  const totalIncome =
    incomeTransactions.reduce((sum, t) => sum + t.amount, 0) +
    totalInitialBalance
  const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0)
  const net = totalIncome - totalExpense

  const formattedIncome = formatCurrency(totalIncome)
  const formattedExpense = formatCurrency(totalExpense)
  const formattedNet = formatCurrency(net)

  const filteredTransactions = useMemo(() => {
    const list = transactions ?? []
    const q = searchQuery.trim().toLowerCase()
    if (!q) return list
    return list.filter((tx) => transactionSearchBlob(tx, t).includes(q))
  }, [
    transactions,
    searchQuery,
    t
  ])

  const handleFilterClick = () => {
    void 0
  }

  const tableEmptyMessage = useMemo((): ReactNode | undefined => {
    const total = transactions?.length ?? 0
    if (total === 0) {
      return (
        <div className="flex flex-col items-center gap-4 py-4">
          <p className="type-body-medium text-gray-800">
            {t('transactions.noTransactions')}
          </p>
          <p className="type-label text-gray-600">
            {t('transactions.getStarted')}
          </p>
          <Button
            color="primary"
            disabled={!householdId}
            icon={<PlusIcon />}
            label={t('transactions.createTransaction')}
            onClick={openCreateTransactionDrawer}
            variant="filled"
          />
        </div>
      )
    }
    if (filteredTransactions.length === 0) {
      return t('common.noResultsFound')
    }
    return undefined
  }, [
    filteredTransactions.length,
    householdId,
    openCreateTransactionDrawer,
    t,
    transactions?.length
  ])

  if (isLoading) {
    return (
      <PageLayout
        title={t('transactions.title')}
        description={t('transactions.pageSubtitle')}
      >
        <div className="flex flex-1 items-center justify-center py-8">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </PageLayout>
    )
  }

  return (
    <>
      <PageLayout
        title={t('transactions.title')}
        description={t('transactions.pageSubtitle')}
        infoCards={[
          {
            id: 'net',
            color: 'blue',
            icon: (
              <Scale
                className="stroke-[1.5]"
                aria-hidden={true}
              />
            ),
            label: t('dashboard.net'),
            value: formattedNet
          },
          {
            id: 'expense',
            color: 'red',
            icon: (
              <TrendingDown
                className="stroke-[1.5]"
                aria-hidden={true}
              />
            ),
            label: t('dashboard.totalExpenses'),
            value: formattedExpense
          },
          {
            id: 'income',
            color: 'green',
            icon: (
              <TrendingUp
                className="stroke-[1.5]"
                aria-hidden={true}
              />
            ),
            label: t('dashboard.totalIncomes'),
            value: formattedIncome
          }
        ]}
      >
        <PageDataTable
          search={{
            value: searchQuery,
            onChange: setSearchQuery,
            placeholder: t('common.search')
          }}
          filter={{
            label: t('common.filter'),
            onClick: handleFilterClick
          }}
          primaryAction={
            <Button
              color="primary"
              disabled={!householdId}
              icon={<PlusIcon />}
              label={t('transactions.createTransaction')}
              onClick={openCreateTransactionDrawer}
              variant="filled"
            />
          }
        >
          <TransactionsTable
            transactions={filteredTransactions}
            emptyMessage={tableEmptyMessage}
            t={t}
            onClone={handleClone}
            onDeleteTransaction={handleDeleteTransaction}
            onDeleteTransfer={handleDeleteTransfer}
            onEditTransaction={handleEditTransaction}
            onEditTransfer={handleEditTransfer}
          />
        </PageDataTable>
      </PageLayout>
      {confirmDialog}
    </>
  )
}
