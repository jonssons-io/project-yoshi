/**
 * Transactions page — income, expense, and transfer transactions
 */

import { createFileRoute } from '@tanstack/react-router'
import { PlusIcon, Scale, TrendingDown, TrendingUp } from 'lucide-react'
import { type ReactNode, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { TransactionStatus, TransactionType } from '@/api/generated/types.gen'
import { Button } from '@/components/button/button'
import { DataTable, useDataTable } from '@/components/data-table'
import { PageLayout } from '@/components/page-layout/page-layout'
import { useAuth } from '@/contexts/auth-context'
import { useDrawer } from '@/drawers'
import { NoData } from '@/features/no-data/no-data'
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
  createTransactionTableColumns,
  type TransactionListItem
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

const TRANSACTION_TYPE_ORDER: TransactionType[] = [
  TransactionType.INCOME,
  TransactionType.EXPENSE,
  TransactionType.TRANSFER
]

function getTransactionType(
  transaction: Pick<TransactionListItem, 'type'>
): TransactionType {
  return transaction.type
}

function TransactionsPage() {
  const { budgetId: urlBudgetId } = Route.useSearch()
  const { userId, householdId } = useAuth()
  const { confirm, confirmDialog } = useConfirmDialog()
  const { t } = useTranslation()
  const { openDrawer } = useDrawer()
  const budgetFilter = urlBudgetId ?? ALL_BUDGETS_VALUE
  const budgetId = budgetFilter === ALL_BUDGETS_VALUE ? undefined : budgetFilter

  const openCreateTransactionDrawer = useCallback(() => {
    openDrawer('createTransaction', {})
  }, [
    openDrawer
  ])

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

  const handleEditTransaction = useCallback(() => {
    void 0
  }, [])

  const handleEditTransfer = useCallback(() => {
    void 0
  }, [])

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

  const columns = useMemo(
    () =>
      createTransactionTableColumns({
        t,
        onEditTransaction: handleEditTransaction,
        onEditTransfer: handleEditTransfer,
        onClone: handleClone,
        onDeleteTransaction: handleDeleteTransaction,
        onDeleteTransfer: handleDeleteTransfer
      }),
    [
      t,
      handleEditTransaction,
      handleEditTransfer,
      handleClone,
      handleDeleteTransaction,
      handleDeleteTransfer
    ]
  )

  const tableData = transactions ?? []

  const {
    table,
    globalFilter,
    setGlobalFilter,
    columnFilters,
    setColumnFilters,
    activeFilters
  } = useDataTable({
    data: tableData,
    columns,
    defaultPageSize: 15
  })

  const filteredRowCount = table.getRowModel().rows.length
  const totalTransactionCount = transactions?.length ?? 0

  const availableTransactionTypes = useMemo(() => {
    const present = new Set<TransactionType>()
    for (const tx of tableData) {
      present.add(tx.type)
    }
    return TRANSACTION_TYPE_ORDER.filter((type) => present.has(type))
  }, [
    tableData
  ])

  const filterDisabled = totalTransactionCount === 0

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
    incomeTransactions.reduce((sum, tx) => sum + tx.amount, 0) +
    totalInitialBalance
  const totalExpense = expenseTransactions.reduce(
    (sum, tx) => sum + tx.amount,
    0
  )
  const net = totalIncome - totalExpense

  const formattedIncome = formatCurrency(totalIncome)
  const formattedExpense = formatCurrency(totalExpense)
  const formattedNet = formatCurrency(net)

  const showNoTransactions = !!householdId && (transactions?.length ?? 0) === 0

  const tableEmptyMessage = useMemo((): ReactNode | undefined => {
    if (showNoTransactions) {
      return undefined
    }
    if (totalTransactionCount === 0) {
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
    if (filteredRowCount === 0) {
      return t('common.noResultsFound')
    }
    return undefined
  }, [
    filteredRowCount,
    householdId,
    openCreateTransactionDrawer,
    showNoTransactions,
    t,
    totalTransactionCount
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
        <div className="flex min-h-0 flex-1 flex-col">
          {showNoTransactions ? (
            <NoData
              variant="no-transactions"
              onAction={openCreateTransactionDrawer}
            />
          ) : (
            <DataTable
              table={table}
              columns={columns}
              globalFilter={globalFilter}
              onGlobalFilterChange={setGlobalFilter}
              filterDisabled={filterDisabled}
              onFilterClick={() =>
                openDrawer('transactionsTableFilterDrawer', {
                  columnFilters,
                  onApply: setColumnFilters,
                  availableTransactionTypes
                })
              }
              activeFilters={activeFilters}
              actionButton={{
                label: t('transactions.createTransaction'),
                icon: <PlusIcon />,
                onClick: openCreateTransactionDrawer,
                disabled: !householdId
              }}
              toolbarLabels={{
                searchPlaceholder: t('common.search'),
                filter: t('common.filter'),
                pillRemoveAriaLabel: t('common.removeFilter')
              }}
              showPagination
              emptyMessage={tableEmptyMessage}
              getRowClassName={(row) =>
                row.status === TransactionStatus.PENDING
                  ? 'opacity-60'
                  : undefined
              }
            />
          )}
        </div>
      </PageLayout>
      {confirmDialog}
    </>
  )
}
