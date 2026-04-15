/**
 * Transactions page — income, expense, and transfer transactions
 */

import { createFileRoute } from '@tanstack/react-router'
import type { ColumnFiltersState } from '@tanstack/react-table'
import { PlusIcon, Scale, TrendingDown, TrendingUp } from 'lucide-react'
import { type ReactNode, useCallback, useMemo, useRef } from 'react'
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
  useCategoriesList,
  useCloneTransaction,
  useDeleteTransaction,
  useTransactionsList,
  useTransactionsSummary
} from '@/hooks/api'
import { useConfirmDialog } from '@/hooks/use-confirm-dialog'
import { useDateRange } from '@/hooks/use-date-range'
import { getErrorMessage } from '@/lib/api-error'
import { accountsById } from '@/lib/accounts'
import { getAmountBounds } from '@/lib/column-filter-utils'
import { formatCurrency } from '@/lib/utils'
import {
  createTransactionTableColumns,
  type TransactionDateFilterValue,
  type TransactionLabelLookup,
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

function readTransactionsDateRangeFilter(columnFilters: ColumnFiltersState):
  | {
      from?: Date
      to?: Date
    }
  | undefined {
  const filter = columnFilters.find((item) => item.id === 'date')
  if (!filter || typeof filter.value !== 'object' || !filter.value)
    return undefined

  const value = filter.value as TransactionDateFilterValue
  return {
    from: value.from ? new Date(value.from) : undefined,
    to: value.to ? new Date(value.to) : undefined
  }
}

function TransactionsPage() {
  const { budgetId: urlBudgetId } = Route.useSearch()
  const { userId, householdId } = useAuth()
  const { dateFrom, dateTo } = useDateRange()
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
    isLoading: transactionsIsLoading,
    refetch
  } = useTransactionsList({
    householdId,
    budgetId,
    userId,
    dateFrom,
    dateTo,
    enabled: !!householdId
  })

  const { data: categories = [] } = useCategoriesList({
    householdId,
    userId,
    enabled: !!householdId
  })

  const { data: accounts = [] } = useAccountsList({
    householdId,
    userId,
    enabled: !!householdId,
    excludeArchived: false
  })

  const accountLabelById = useMemo(() => accountsById(accounts), [
    accounts
  ])

  const categoryById = useMemo(
    () =>
      new Map(
        categories.map((c) => [
          c.id,
          c.name
        ])
      ),
    [
      categories
    ]
  )

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

  const handleEditTransaction = useCallback(
    (tx: TransactionListItem) => {
      openDrawer('editTransaction', {
        transactionId: tx.id
      })
    },
    [
      openDrawer
    ]
  )

  const handleEditTransfer = useCallback(
    (transfer: {
      id: string
      name: string
      budgetId?: string | null
      amount: number
      date: Date
      fromAccountId: string
      toAccountId?: string | null
      notes: string | null
    }) => {
      openDrawer('editTransaction', {
        transactionId: transfer.id
      })
    },
    [
      openDrawer
    ]
  )

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

  const labelLookupRef = useRef<TransactionLabelLookup>({
    accounts: new Map(),
    budgets: new Map(),
    categories: new Map(),
    recipientsSenders: new Map()
  })

  const columns = useMemo(
    () =>
      createTransactionTableColumns({
        t,
        labelLookupRef,
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

  const filteredRowCount = table.getFilteredRowModel().rows.length
  const totalTransactionCount = transactions?.length ?? 0
  const dateRangeFilter = useMemo(
    () => readTransactionsDateRangeFilter(columnFilters),
    [
      columnFilters
    ]
  )
  const canUseSummary = useMemo(
    () => columnFilters.every((filter) => filter.id === 'date'),
    [
      columnFilters
    ]
  )
  const { data: summary, isLoading: summaryIsLoading } = useTransactionsSummary(
    {
      householdId,
      budgetId,
      dateFrom: dateRangeFilter?.from ?? dateFrom,
      dateTo: dateRangeFilter?.to ?? dateTo,
      enabled: !!householdId && canUseSummary
    }
  )

  const availableTransactionTypes = useMemo(() => {
    const present = new Set<TransactionType>()
    for (const tx of tableData) {
      present.add(tx.type)
    }
    return TRANSACTION_TYPE_ORDER.filter((type) => present.has(type))
  }, [
    tableData
  ])

  const availableAccounts = useMemo(() => {
    const seen = new Map<string, string>()
    for (const tx of tableData) {
      if (tx.account?.id && !seen.has(tx.account.id)) {
        seen.set(
          tx.account.id,
          accountLabelById.get(tx.account.id) ??
            tx.account.name ??
            tx.account.id
        )
      }
      if (tx.transferToAccount?.id && !seen.has(tx.transferToAccount.id)) {
        seen.set(
          tx.transferToAccount.id,
          accountLabelById.get(tx.transferToAccount.id) ??
            tx.transferToAccount.name ??
            tx.transferToAccount.id
        )
      }
    }
    labelLookupRef.current.accounts = seen
    return [
      ...seen
    ].map(([value, label]) => ({
      value,
      label
    }))
  }, [
    accountLabelById,
    tableData
  ])

  const availableBudgets = useMemo(() => {
    const seen = new Map<string, string>()
    for (const tx of tableData) {
      if (tx.budget?.id && !seen.has(tx.budget.id)) {
        seen.set(tx.budget.id, tx.budget.name ?? tx.budget.id)
      }
      for (const s of tx.splits ?? []) {
        const id = s.budgetId ?? s.budget?.id
        if (id && !seen.has(id)) {
          seen.set(id, s.budget?.name ?? id)
        }
      }
    }
    labelLookupRef.current.budgets = seen
    return [
      ...seen
    ].map(([value, label]) => ({
      value,
      label
    }))
  }, [
    tableData
  ])

  const availableCategories = useMemo(() => {
    const seen = new Map<string, string>(categoryById)
    for (const tx of tableData) {
      if (tx.category?.id && !seen.has(tx.category.id)) {
        seen.set(tx.category.id, tx.category.name ?? tx.category.id)
      }
      for (const s of tx.splits ?? []) {
        const id = s.categoryId ?? s.category?.id
        if (id && !seen.has(id)) {
          seen.set(id, s.category?.name ?? categoryById.get(id) ?? id)
        }
      }
    }
    labelLookupRef.current.categories = seen
    return [
      ...seen
    ].map(([value, label]) => ({
      value,
      label
    }))
  }, [
    categoryById,
    tableData
  ])

  const availableRecipientsSenders = useMemo(() => {
    const seen = new Map<string, string>()
    for (const tx of tableData) {
      if (
        tx.type === TransactionType.INCOME &&
        tx.incomeSource?.id &&
        !seen.has(tx.incomeSource.id)
      ) {
        seen.set(tx.incomeSource.id, tx.incomeSource.name ?? tx.incomeSource.id)
      }
      if (
        tx.type === TransactionType.EXPENSE &&
        tx.recipient?.id &&
        !seen.has(tx.recipient.id)
      ) {
        seen.set(tx.recipient.id, tx.recipient.name ?? tx.recipient.id)
      }
    }
    labelLookupRef.current.recipientsSenders = seen
    return [
      ...seen
    ].map(([value, label]) => ({
      value,
      label
    }))
  }, [
    tableData
  ])

  const amountBounds = useMemo(
    () => getAmountBounds(tableData),
    [
      tableData
    ]
  )

  const filterDisabled = totalTransactionCount === 0

  const filteredTransactions = table
    .getFilteredRowModel()
    .rows.map((row) => row.original)

  const fallbackTotalIncome = filteredTransactions.reduce(
    (sum, transaction) => {
      if (getTransactionType(transaction) !== TransactionType.INCOME) return sum
      return sum + transaction.amount
    },
    0
  )
  const fallbackTotalExpense = filteredTransactions.reduce(
    (sum, transaction) => {
      if (getTransactionType(transaction) !== TransactionType.EXPENSE)
        return sum
      return sum + transaction.amount
    },
    0
  )
  const totalIncome =
    canUseSummary && summary ? summary.totalIncome : fallbackTotalIncome
  const totalExpense =
    canUseSummary && summary ? summary.totalExpense : fallbackTotalExpense
  const net =
    canUseSummary && summary ? summary.net : totalIncome - totalExpense

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

  return (
    <>
      <PageLayout
        title={t('transactions.title')}
        description={t('transactions.pageSubtitle')}
        loadingHeader={summaryIsLoading}
        loadingContent={transactionsIsLoading}
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
                  availableTransactionTypes,
                  availableAccounts,
                  availableBudgets,
                  availableCategories,
                  availableRecipientsSenders,
                  amountBounds
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
                  ? 'bg-sky-50'
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
