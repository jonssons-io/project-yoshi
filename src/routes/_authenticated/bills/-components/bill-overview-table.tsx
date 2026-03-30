import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import type { TFunction } from 'i18next'
import { ArrowLeftRight, BookUp, Link, SquarePen, Trash2 } from 'lucide-react'
import type { MutableRefObject } from 'react'

import { BillPaymentHandling, InstanceStatus } from '@/api/generated/types.gen'
import type { BadgeColor } from '@/components/badge/badge'
import { Badge } from '@/components/badge/badge'
import type { DataTableColumnDef } from '@/components/data-table'
import { TableRowMenu } from '@/components/table-row-menu/table-row-menu'
import { formatCurrency } from '@/lib/utils'

export type BillOverviewStatus =
  | 'handled'
  | 'pending'
  | 'overdue'
  | 'upcoming'

export type BillOverviewRow = {
  id: string
  billId: string | null
  dueDate: Date
  billName: string
  status: BillOverviewStatus
  transactionConnected: boolean
  amount: number
  paymentHandling: BillPaymentHandling | null | undefined
  accountId: string | null
  accountName: string
  budgetId: string | null
  budgetName: string
  categoryId: string | null
  categoryName: string
  recipientId: string
  recipientName: string
}

export function deriveBillOverviewStatus(
  apiStatus: InstanceStatus,
  dueDate: Date
): BillOverviewStatus {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (apiStatus === InstanceStatus.HANDLED) return 'handled'
  if (apiStatus === InstanceStatus.DUE) return 'pending'
  if (apiStatus === InstanceStatus.UPCOMING && dueDate < today) return 'overdue'
  return 'upcoming'
}

const STATUS_BADGE_COLOR: Record<BillOverviewStatus, BadgeColor> = {
  upcoming: 'gray',
  overdue: 'red',
  pending: 'blue',
  handled: 'green'
}

const HANDLING_BADGE_COLOR: Record<BillPaymentHandling, BadgeColor> = {
  [BillPaymentHandling.AUTOGIRO]: 'yellow',
  [BillPaymentHandling.E_INVOICE]: 'green',
  [BillPaymentHandling.MAIL]: 'teal',
  [BillPaymentHandling.PORTAL]: 'red',
  [BillPaymentHandling.PAPER]: 'orange'
}

export type LabelLookup = {
  accounts: Map<string, string>
  budgets: Map<string, string>
  categories: Map<string, string>
  recipients: Map<string, string>
}

export function createBillOverviewColumns(opts: {
  t: TFunction
  labelLookupRef: MutableRefObject<LabelLookup>
  onEditBillInstance: (instanceId: string) => void
  onCreateTransaction: (row: BillOverviewRow) => void
  onViewTransaction: (instanceId: string) => void
  onViewBasis: (billId: string) => void
  onDeleteBill: (instanceId: string) => void
}): DataTableColumnDef<BillOverviewRow>[] {
  const { t, labelLookupRef, onEditBillInstance, onCreateTransaction, onViewTransaction, onViewBasis, onDeleteBill } = opts
  const statusLabel = (s: BillOverviewStatus) => t(`bills.status_.${s}`)
  const handlingLabel = (h: BillPaymentHandling) => t(`bills.paymentHandling.${h}`)

  return [
    {
      id: 'dueDate',
      accessorFn: (row) => row.dueDate.getTime(),
      header: t('common.dueDate'),
      cell: ({ row }) =>
        format(row.original.dueDate, 'P', { locale: sv }),
      sortingFn: 'basic',
      meta: {
        globalSearchable: false
      }
    },
    {
      id: 'billName',
      accessorKey: 'billName',
      header: t('common.bill'),
      cell: ({ row }) => row.original.billName,
      meta: {
        globalSearchable: true
      }
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: t('bills.status'),
      cell: ({ row }) => (
        <Badge
          color={STATUS_BADGE_COLOR[row.original.status]}
          label={statusLabel(row.original.status)}
        />
      ),
      sortingFn: (rowA, rowB) => {
        const order: BillOverviewStatus[] = [
          'handled',
          'pending',
          'overdue',
          'upcoming'
        ]
        return (
          order.indexOf(rowA.original.status) -
          order.indexOf(rowB.original.status)
        )
      },
      meta: {
        globalSearchable: false,
        searchValue: (row) => statusLabel(row.status)
      }
    },
    {
      id: 'amount',
      accessorKey: 'amount',
      header: t('common.amount'),
      cell: ({ row }) => formatCurrency(row.original.amount),
      sortingFn: 'basic',
      meta: {
        globalSearchable: true,
        searchValue: (row: BillOverviewRow) =>
          `${String(row.amount)} ${formatCurrency(row.amount)}`
      }
    },
    {
      id: 'paymentHandling',
      accessorKey: 'paymentHandling',
      header: t('common.handling'),
      cell: ({ row }) => {
        const h = row.original.paymentHandling
        if (!h) return null
        return (
          <Badge
            color={HANDLING_BADGE_COLOR[h] ?? 'gray'}
            label={handlingLabel(h)}
          />
        )
      },
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.paymentHandling ?? ''
        const b = rowB.original.paymentHandling ?? ''
        return a.localeCompare(b)
      },
      meta: {
        globalSearchable: false,
        searchValue: (row: BillOverviewRow) =>
          row.paymentHandling ? handlingLabel(row.paymentHandling) : ''
      }
    },
    {
      id: 'account',
      accessorKey: 'accountName',
      header: t('transfers.fromAccount'),
      cell: ({ row }) => row.original.accountName,
      meta: {
        globalSearchable: true
      }
    },
    {
      id: 'budget',
      accessorKey: 'budgetName',
      header: t('common.budget'),
      cell: ({ row }) => row.original.budgetName,
      meta: {
        globalSearchable: true
      }
    },
    {
      id: 'category',
      accessorKey: 'categoryName',
      header: t('common.category'),
      cell: ({ row }) => row.original.categoryName,
      meta: {
        globalSearchable: true
      }
    },
    {
      id: 'recipient',
      accessorKey: 'recipientName',
      header: t('common.recipient'),
      cell: ({ row }) => row.original.recipientName,
      meta: {
        globalSearchable: true,
        filterable: true,
        filterLabel: t('common.recipient'),
        filterPillValue: (value: unknown) => {
          if (!Array.isArray(value)) return ''
          const lookup = labelLookupRef.current.recipients
          return (value as string[])
            .map((id) => lookup.get(id) ?? id)
            .join(', ')
        }
      },
      filterFn: (row, _columnId, filterValue: string[]) => {
        return filterValue.includes(row.original.recipientId)
      }
    },
    {
      id: 'actions',
      enableSorting: false,
      header: () => <span className="sr-only">{t('common.actions')}</span>,
      cell: ({ row }) => {
        const connected = row.original.transactionConnected
        return (
          <TableRowMenu
            aria-label={t('common.actions')}
            items={
              connected
                ? [
                    {
                      id: 'edit',
                      label: t('bills.overviewRowMenu.editBill'),
                      icon: <SquarePen />,
                      disabled: true,
                      disabledReason: t('bills.overviewRowMenu.editDisabledTooltip'),
                      onSelect: () => onEditBillInstance(row.original.id)
                    },
                    {
                      id: 'viewTransaction',
                      label: t('bills.overviewRowMenu.viewTransaction'),
                      icon: <Link />,
                      onSelect: () => onViewTransaction(row.original.id)
                    },
                    {
                      id: 'viewBasis',
                      label: t('bills.overviewRowMenu.viewBasis'),
                      icon: <BookUp />,
                      onSelect: () => {
                        if (row.original.billId) onViewBasis(row.original.billId)
                      }
                    },
                    {
                      id: 'delete',
                      label: t('bills.overviewRowMenu.deleteBill'),
                      icon: <Trash2 />,
                      onSelect: () => onDeleteBill(row.original.id),
                      destructive: true,
                      separatorBefore: true
                    }
                  ]
                : [
                    {
                      id: 'createTransaction',
                      label: t('bills.overviewRowMenu.createTransaction'),
                      icon: <ArrowLeftRight />,
                      onSelect: () => onCreateTransaction(row.original)
                    },
                    {
                      id: 'edit',
                      label: t('bills.overviewRowMenu.editBill'),
                      icon: <SquarePen />,
                      onSelect: () => onEditBillInstance(row.original.id)
                    },
                    {
                      id: 'viewBasis',
                      label: t('bills.overviewRowMenu.viewBasis'),
                      icon: <BookUp />,
                      onSelect: () => {
                        if (row.original.billId) onViewBasis(row.original.billId)
                      }
                    },
                    {
                      id: 'delete',
                      label: t('bills.overviewRowMenu.deleteBill'),
                      icon: <Trash2 />,
                      onSelect: () => onDeleteBill(row.original.id),
                      destructive: true,
                      separatorBefore: true
                    }
                  ]
            }
          />
        )
      },
      meta: {
        globalSearchable: false
      }
    }
  ]
}
