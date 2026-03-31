import { createColumnHelper, type Row } from '@tanstack/react-table'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import type { TFunction } from 'i18next'
import {
  ArrowRight,
  CopyIcon,
  Layers,
  Link2,
  PencilIcon,
  TrashIcon
} from 'lucide-react'
import type { ReactNode, RefObject } from 'react'

import { type Transaction, TransactionType } from '@/api/generated/types.gen'
import { Badge } from '@/components/badge/badge'
import type { DataTableColumnDef } from '@/components/data-table'
import { IconButton } from '@/components/icon-button/icon-button'
import { TableRowMenu } from '@/components/table-row-menu/table-row-menu'
import { formatCurrency } from '@/lib/utils'

export type TransactionListItem = Omit<Transaction, 'date'> & {
  date: Date
}

export type TransactionDateFilterValue = {
  from?: string
  to?: string
}

export type TransactionAmountFilterValue = {
  min?: number
  max?: number
}

export type TransactionLabelLookup = {
  accounts: Map<string, string>
  budgets: Map<string, string>
  categories: Map<string, string>
  recipientsSenders: Map<string, string>
}

type PresenceFilterValue = Array<'has' | 'doesNotHave'>

export type CreateTransactionTableColumnsParams = {
  t: TFunction
  labelLookupRef: RefObject<TransactionLabelLookup>
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

/** Plain text matched by the toolbar global search for the account column. */
function accountSearchText(transaction: TransactionListItem): string {
  if (transaction.type === TransactionType.TRANSFER) {
    return `${transaction.account?.name ?? ''} ${transaction.transferToAccount?.name ?? ''}`
  }
  return transaction.account?.name ?? ''
}

/** Plain text matched by the toolbar global search for the category column. */
function categorySearchText(row: TransactionListItem, t: TFunction): string {
  if (row.type === TransactionType.TRANSFER) {
    return ''
  }
  const splits = row.splits
  if (splits && splits.length > 0) {
    return `${splits.length} ${t('common.splits')}`
  }
  return row.category?.name ?? t('common.uncategorized')
}

function isLinkedToScheduledInstance(
  transaction: TransactionListItem
): boolean {
  return Boolean(transaction.billInstance?.id || transaction.incomeInstance?.id)
}

function transactionNameSearchText(transaction: TransactionListItem): string {
  return [
    transaction.name,
    transaction.bill?.name,
    transaction.billInstance?.name,
    transaction.income?.name,
    transaction.incomeInstance?.name
  ]
    .filter(Boolean)
    .join(' ')
}

function presenceFilterPillValue(
  value: unknown,
  t: TFunction
): string {
  if (!Array.isArray(value) || value.length !== 1) return ''
  return value[0] === 'has' ? t('common.has') : t('common.doesNotHave')
}

function matchesPresenceFilter(
  value: boolean,
  filterValue: unknown
): boolean {
  if (!Array.isArray(filterValue) || filterValue.length !== 1) return true
  return filterValue[0] === 'has' ? value : !value
}

function accountSortValue(transaction: TransactionListItem): string {
  if (transaction.type === TransactionType.TRANSFER) {
    const from = transaction.account?.name ?? ''
    const to = transaction.transferToAccount?.name ?? ''
    return `${from} ${to}`.toLowerCase()
  }
  return (transaction.account?.name ?? '').toLowerCase()
}

function accountCell(transaction: TransactionListItem): ReactNode {
  if (transaction.type === TransactionType.TRANSFER) {
    const from = transaction.account?.name ?? emptyCellDash
    const to = transaction.transferToAccount?.name ?? emptyCellDash
    return (
      <span className="inline-flex items-center gap-1">
        <span className="truncate">{from}</span>
        <ArrowRight
          className="size-3.5 shrink-0 text-gray-600"
          strokeWidth={1.5}
          aria-hidden={true}
        />
        <span className="truncate">{to}</span>
      </span>
    )
  }
  return transaction.account?.name ?? emptyCellDash
}

function recipientSenderSortValue(transaction: TransactionListItem): string {
  if (transaction.type === TransactionType.TRANSFER) return ''
  if (transaction.type === TransactionType.INCOME) {
    return (transaction.incomeSource?.name ?? '').toLowerCase()
  }
  return (transaction.recipient?.name ?? '').toLowerCase()
}

function recipientSenderSearchText(transaction: TransactionListItem): string {
  if (transaction.type === TransactionType.TRANSFER) return ''
  if (transaction.type === TransactionType.INCOME) {
    return transaction.incomeSource?.name ?? ''
  }
  return transaction.recipient?.name ?? ''
}

function recipientSenderCell(transaction: TransactionListItem): ReactNode {
  if (transaction.type === TransactionType.TRANSFER) {
    return <span className="text-gray-600">{emptyCellDash}</span>
  }
  if (transaction.type === TransactionType.INCOME) {
    return transaction.incomeSource?.name ?? emptyCellDash
  }
  return transaction.recipient?.name ?? emptyCellDash
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

function typeFilterPillValue(value: unknown, t: TFunction): string {
  if (!Array.isArray(value)) return String(value)
  return (value as TransactionType[])
    .map((v) => typeBadgeLabel(v, t))
    .join(', ')
}

/**
 * Column definitions for the transactions data table (search, sort, filters, row actions).
 */
export function createTransactionTableColumns({
  t,
  labelLookupRef,
  onEditTransaction,
  onEditTransfer,
  onClone,
  onDeleteTransaction,
  onDeleteTransfer
}: CreateTransactionTableColumnsParams): DataTableColumnDef<TransactionListItem>[] {
  return [
    columnHelper.accessor((row) => row.date.getTime(), {
      id: 'date',
      header: t('common.date'),
      sortingFn: (rowA, rowB) =>
        rowA.original.date.getTime() - rowB.original.date.getTime(),
      filterFn: (
        row: Row<TransactionListItem>,
        _columnId: string,
        filterValue: TransactionDateFilterValue
      ) => {
        const time = row.original.date.getTime()
        if (filterValue.from && time < new Date(filterValue.from).getTime())
          return false
        if (filterValue.to && time > new Date(filterValue.to).getTime())
          return false
        return true
      },
      meta: {
        globalSearchable: true,
        searchValue: (row: TransactionListItem) =>
          format(row.date, 'yyyy-MM-dd'),
        filterable: true,
        filterLabel: t('common.date'),
        filterPillValue: (value: unknown) => {
          const v = value as TransactionDateFilterValue
          const parts: string[] = []
          if (v.from) parts.push(format(new Date(v.from), 'P', { locale: sv }))
          if (v.to) parts.push(format(new Date(v.to), 'P', { locale: sv }))
          return parts.join(' – ')
        }
      },
      cell: (ctx) => format(ctx.row.original.date, 'yyyy-MM-dd')
    }),
    columnHelper.accessor((row) => row.name.toLowerCase(), {
      id: 'name',
      header: t('forms.transactionName'),
      sortingFn: (rowA, rowB) =>
        rowA.original.name.localeCompare(rowB.original.name, undefined, {
          sensitivity: 'base',
          numeric: true
        }),
      filterFn: (
        row: Row<TransactionListItem>,
        _columnId: string,
        filterValue: PresenceFilterValue
      ) => matchesPresenceFilter(isLinkedToScheduledInstance(row.original), filterValue),
      meta: {
        globalSearchable: true,
        searchValue: (row: TransactionListItem) => transactionNameSearchText(row),
        filterable: true,
        filterLabel: t('transactions.scheduledLink'),
        filterPillValue: (value: unknown) => presenceFilterPillValue(value, t)
      },
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
      sortingFn: (rowA, rowB) =>
        typeOrder[rowA.original.type] - typeOrder[rowB.original.type],
      filterFn: (
        row: Row<TransactionListItem>,
        _columnId: string,
        filterValue: unknown
      ) => {
        if (!filterValue || !Array.isArray(filterValue)) return true
        const types = filterValue as TransactionType[]
        if (types.length === 0) return true
        return types.includes(row.original.type)
      },
      meta: {
        globalSearchable: true,
        searchValue: (row: TransactionListItem) =>
          `${row.type} ${typeBadgeLabel(row.type, t)}`,
        filterable: true,
        filterLabel: t('forms.transactionType'),
        filterPillValue: (value: unknown) => typeFilterPillValue(value, t)
      },
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
      sortingFn: (rowA, rowB) => rowA.original.amount - rowB.original.amount,
      filterFn: (
        row: Row<TransactionListItem>,
        _columnId: string,
        filterValue: TransactionAmountFilterValue
      ) => {
        const amount = row.original.amount
        if (filterValue.min !== undefined && amount < filterValue.min)
          return false
        if (filterValue.max !== undefined && amount > filterValue.max)
          return false
        return true
      },
      meta: {
        globalSearchable: true,
        searchValue: (row: TransactionListItem) =>
          `${String(row.amount)} ${formatCurrency(row.amount)}`,
        filterable: true,
        filterLabel: t('common.amount'),
        filterPillValue: (value: unknown) => {
          const v = value as TransactionAmountFilterValue
          const parts: string[] = []
          if (v.min !== undefined) parts.push(formatCurrency(v.min))
          if (v.max !== undefined) parts.push(formatCurrency(v.max))
          return parts.join(' – ')
        }
      },
      cell: (ctx) => formatCurrency(ctx.row.original.amount)
    }),
    columnHelper.accessor((row) => accountSortValue(row), {
      id: 'account',
      header: t('common.account'),
      sortingFn: (rowA, rowB) =>
        accountSortValue(rowA.original).localeCompare(
          accountSortValue(rowB.original),
          undefined,
          {
            numeric: true
          }
        ),
      filterFn: (
        row: Row<TransactionListItem>,
        _columnId: string,
        filterValue: string[]
      ) => {
        if (filterValue.includes(row.original.account.id)) return true
        if (
          row.original.transferToAccount?.id &&
          filterValue.includes(row.original.transferToAccount.id)
        )
          return true
        return false
      },
      meta: {
        globalSearchable: true,
        searchValue: (row: TransactionListItem) => accountSearchText(row),
        filterable: true,
        filterLabel: t('common.account'),
        filterPillValue: (value: unknown) => {
          if (!Array.isArray(value)) return ''
          const lookup = labelLookupRef.current.accounts
          return (value as string[])
            .map((id) => lookup.get(id) ?? id)
            .join(', ')
        }
      },
      cell: (ctx) => accountCell(ctx.row.original)
    }),
    columnHelper.accessor((row) => (row.budget?.name ?? '').toLowerCase(), {
      id: 'budget',
      header: t('common.budget'),
      sortingFn: (rowA, rowB) => {
        const a = (rowA.original.budget?.name ?? '').toLowerCase()
        const b = (rowB.original.budget?.name ?? '').toLowerCase()
        return a.localeCompare(b, undefined, {
          numeric: true
        })
      },
      filterFn: (
        row: Row<TransactionListItem>,
        _columnId: string,
        filterValue: string[]
      ) => {
        return filterValue.includes(row.original.budget?.id ?? '')
      },
      meta: {
        globalSearchable: true,
        searchValue: (row: TransactionListItem) => row.budget?.name ?? '',
        filterable: true,
        filterLabel: t('common.budget'),
        filterPillValue: (value: unknown) => {
          if (!Array.isArray(value)) return ''
          const lookup = labelLookupRef.current.budgets
          return (value as string[])
            .map((id) => lookup.get(id) ?? id)
            .join(', ')
        }
      },
      cell: (ctx) => ctx.row.original.budget?.name ?? emptyCellDash
    }),
    columnHelper.accessor((row) => categorySortValue(row), {
      id: 'category',
      header: t('common.category'),
      sortingFn: (rowA, rowB) =>
        categorySortValue(rowA.original).localeCompare(
          categorySortValue(rowB.original),
          undefined,
          {
            numeric: true
          }
        ),
      filterFn: (
        row: Row<TransactionListItem>,
        _columnId: string,
        filterValue: string[]
      ) => {
        return filterValue.includes(row.original.category?.id ?? '')
      },
      meta: {
        globalSearchable: true,
        searchValue: (row: TransactionListItem) => categorySearchText(row, t),
        filterable: true,
        filterLabel: t('common.category'),
        filterPillValue: (value: unknown) => {
          if (!Array.isArray(value)) return ''
          const lookup = labelLookupRef.current.categories
          return (value as string[])
            .map((id) => lookup.get(id) ?? id)
            .join(', ')
        }
      },
      cell: (ctx) => categoryCell(ctx.row.original, t)
    }),
    columnHelper.accessor((row) => recipientSenderSortValue(row), {
      id: 'recipientSender',
      header: t('common.recipientSender'),
      sortingFn: (rowA, rowB) =>
        recipientSenderSortValue(rowA.original).localeCompare(
          recipientSenderSortValue(rowB.original),
          undefined,
          { numeric: true }
        ),
      filterFn: (
        row: Row<TransactionListItem>,
        _columnId: string,
        filterValue: string[]
      ) => {
        const tx = row.original
        if (tx.type === TransactionType.TRANSFER) return false
        if (tx.type === TransactionType.INCOME) {
          return filterValue.includes(tx.incomeSource?.id ?? '')
        }
        return filterValue.includes(tx.recipient?.id ?? '')
      },
      meta: {
        globalSearchable: true,
        searchValue: (row: TransactionListItem) =>
          recipientSenderSearchText(row),
        filterable: true,
        filterLabel: t('common.recipientSender'),
        filterPillValue: (value: unknown) => {
          if (!Array.isArray(value)) return ''
          const lookup = labelLookupRef.current.recipientsSenders
          return (value as string[])
            .map((id) => lookup.get(id) ?? id)
            .join(', ')
        }
      },
      cell: (ctx) => recipientSenderCell(ctx.row.original)
    }),
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
  ]
}
