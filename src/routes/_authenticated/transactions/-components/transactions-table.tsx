import { type ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { format } from 'date-fns'
import type { TFunction } from 'i18next'
import { CopyIcon, Layers, Link2, PencilIcon, TrashIcon } from 'lucide-react'
import { type ReactNode, useMemo } from 'react'

import {
  type Transaction,
  TransactionStatus,
  TransactionType
} from '@/api/generated/types.gen'
import { Badge } from '@/components/badge/badge'
import { DataTable } from '@/components/data-table/data-table'
import { IconButton } from '@/components/icon-button/icon-button'
import { TableRowMenu } from '@/components/table-row-menu/table-row-menu'
import { formatCurrency } from '@/lib/utils'

export type TransactionListItem = Omit<Transaction, 'date'> & {
  date: Date
}

type TransactionsTableProps = {
  transactions: TransactionListItem[]
  t: TFunction
  emptyMessage?: ReactNode
  onEditTransaction: (transaction: TransactionListItem) => void
  onEditTransfer: (transfer: {
    id: string
    name: string
    budgetId?: string | null
    amount: number
    date: Date
    fromAccountId: string
    toAccountId?: string | null
    notes: string | null
  }) => void
  onClone: (transaction: TransactionListItem) => void
  onDeleteTransaction: (transaction: TransactionListItem) => void
  onDeleteTransfer: (transaction: TransactionListItem) => void
}

const columnHelper = createColumnHelper<TransactionListItem>()

const emptyCellDash = '-'

const typeOrder: Record<TransactionType, number> = {
  [TransactionType.INCOME]: 0,
  [TransactionType.EXPENSE]: 1,
  [TransactionType.TRANSFER]: 2
}

function isLinkedToScheduledInstance(
  transaction: TransactionListItem
): boolean {
  return Boolean(transaction.billInstance?.id || transaction.incomeInstance?.id)
}

function accountSortValue(transaction: TransactionListItem): string {
  if (transaction.type === TransactionType.TRANSFER) {
    const from = transaction.account?.name ?? ''
    const to = transaction.transferToAccount?.name ?? ''
    return `${from} ${to}`.toLowerCase()
  }
  return (transaction.account?.name ?? '').toLowerCase()
}

function accountDisplay(transaction: TransactionListItem): string {
  if (transaction.type === TransactionType.TRANSFER) {
    const from = transaction.account?.name ?? emptyCellDash
    const to = transaction.transferToAccount?.name ?? emptyCellDash
    return `${from} → ${to}`
  }
  return transaction.account?.name ?? emptyCellDash
}

function categorySortValue(transaction: TransactionListItem): string {
  if (transaction.type === TransactionType.TRANSFER) return ''
  const splits = transaction.splits
  if (splits && splits.length > 0) {
    return `splits-${splits.length}`
  }
  return (transaction.category?.name ?? '').toLowerCase()
}

function categoryCell(
  transaction: TransactionListItem,
  t: TFunction
): ReactNode {
  if (transaction.type === TransactionType.TRANSFER) {
    return <span className="text-gray-600">{emptyCellDash}</span>
  }
  const splits = transaction.splits
  if (splits && splits.length > 0) {
    return (
      <span className="inline-flex items-center gap-1">
        <Layers
          className="size-4 shrink-0 text-gray-600"
          strokeWidth={1.5}
          aria-hidden={true}
        />
        <Badge
          color="gray"
          label={`${splits.length} ${t('common.splits')}`}
        />
      </span>
    )
  }
  return <span>{transaction.category?.name ?? t('common.uncategorized')}</span>
}

function typeBadgeLabel(type: TransactionType, t: TFunction): string {
  switch (type) {
    case TransactionType.INCOME:
      return t('transactions.income')
    case TransactionType.EXPENSE:
      return t('transactions.expense')
    case TransactionType.TRANSFER:
      return t('common.transfer')
    default:
      return type
  }
}

function typeBadgeColor(type: TransactionType): 'green' | 'red' | 'blue' {
  if (type === TransactionType.INCOME) return 'green'
  if (type === TransactionType.EXPENSE) return 'red'
  return 'blue'
}

/**
 * Transactions list with design-system badges, linked-instance control, and row actions.
 */
export function TransactionsTable({
  transactions,
  t,
  emptyMessage,
  onEditTransaction,
  onEditTransfer,
  onClone,
  onDeleteTransaction,
  onDeleteTransfer
}: TransactionsTableProps) {
  const columns = useMemo(
    () =>
      [
        columnHelper.accessor((row) => row.date.getTime(), {
          id: 'date',
          header: t('common.date'),
          cell: (ctx) => format(ctx.row.original.date, 'yyyy-MM-dd')
        }),
        columnHelper.accessor((row) => row.name.toLowerCase(), {
          id: 'name',
          header: t('forms.transactionName'),
          cell: (ctx) => {
            const tx = ctx.row.original
            const linked = isLinkedToScheduledInstance(tx)
            return (
              <span className="inline-flex max-w-full min-w-0 items-center gap-1">
                <span className="min-w-0 truncate">{tx.name}</span>
                {linked ? (
                  <IconButton
                    type="button"
                    variant="text"
                    color="primary"
                    icon={<Link2 />}
                    onClick={() => void 0}
                    title={t('transactions.scheduledLink')}
                    aria-label={t('transactions.scheduledLink')}
                  />
                ) : null}
              </span>
            )
          }
        }),
        columnHelper.accessor((row) => typeOrder[row.type], {
          id: 'type',
          header: t('forms.transactionType'),
          cell: (ctx) => {
            const type = ctx.row.original.type
            return (
              <Badge
                color={typeBadgeColor(type)}
                label={typeBadgeLabel(type, t)}
              />
            )
          }
        }),
        columnHelper.accessor((row) => row.amount, {
          id: 'amount',
          header: t('common.amount'),
          cell: (ctx) => formatCurrency(ctx.row.original.amount)
        }),
        columnHelper.accessor((row) => accountSortValue(row), {
          id: 'account',
          header: t('common.account'),
          cell: (ctx) => accountDisplay(ctx.row.original)
        }),
        columnHelper.accessor((row) => (row.budget?.name ?? '').toLowerCase(), {
          id: 'budget',
          header: t('common.budget'),
          cell: (ctx) => ctx.row.original.budget?.name ?? emptyCellDash
        }),
        columnHelper.accessor((row) => categorySortValue(row), {
          id: 'category',
          header: t('common.category'),
          cell: (ctx) => categoryCell(ctx.row.original, t)
        }),
        columnHelper.accessor(
          (row) => (row.recipient?.name ?? '').toLowerCase(),
          {
            id: 'recipient',
            header: t('common.recipient'),
            cell: (ctx) => ctx.row.original.recipient?.name ?? emptyCellDash
          }
        ),
        columnHelper.display({
          id: 'actions',
          enableSorting: false,
          header: () => <span className="sr-only">{t('common.actions')}</span>,
          cell: (ctx) => {
            const tx = ctx.row.original
            const type = tx.type
            const items =
              type === TransactionType.TRANSFER
                ? [
                    {
                      id: 'edit',
                      label: t('transfers.edit'),
                      icon: <PencilIcon />,
                      onSelect: () =>
                        onEditTransfer({
                          id: tx.id,
                          name: tx.name,
                          budgetId: tx.budget?.id,
                          amount: tx.amount,
                          date: tx.date,
                          notes: tx.notes ?? null,
                          fromAccountId: tx.account.id,
                          toAccountId: tx.transferToAccount?.id
                        })
                    },
                    {
                      id: 'delete',
                      label: `${t('common.delete')} ${t('common.transfer')}`,
                      icon: <TrashIcon />,
                      destructive: true,
                      onSelect: () => onDeleteTransfer(tx)
                    }
                  ]
                : [
                    {
                      id: 'edit',
                      label: t('common.edit'),
                      icon: <PencilIcon />,
                      onSelect: () => onEditTransaction(tx)
                    },
                    {
                      id: 'clone',
                      label: t('common.clone'),
                      icon: <CopyIcon />,
                      onSelect: () => onClone(tx)
                    },
                    {
                      id: 'delete',
                      label: t('common.delete'),
                      destructive: true,
                      icon: <TrashIcon />,
                      onSelect: () => onDeleteTransaction(tx)
                    }
                  ]
            return (
              <TableRowMenu
                aria-label={t('common.actions')}
                items={items}
              />
            )
          }
        })
      ] as ColumnDef<TransactionListItem>[],
    [
      t,
      onEditTransaction,
      onEditTransfer,
      onClone,
      onDeleteTransaction,
      onDeleteTransfer
    ]
  )

  return (
    <DataTable
      columns={columns}
      data={transactions}
      emptyMessage={emptyMessage}
      getRowClassName={(row) =>
        row.status === TransactionStatus.PENDING ? 'opacity-60' : undefined
      }
    />
  )
}
