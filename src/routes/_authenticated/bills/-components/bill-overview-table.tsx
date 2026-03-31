import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import type { TFunction } from 'i18next'
import {
  ArrowLeftRight,
  BookUp,
  Link,
  Link2,
  SquarePen,
  Trash2
} from 'lucide-react'
import type { MutableRefObject } from 'react'

import { BillPaymentHandling, InstanceStatus } from '@/api/generated/types.gen'
import type { BadgeColor } from '@/components/badge/badge'
import { Badge } from '@/components/badge/badge'
import type { DataTableColumnDef } from '@/components/data-table'
import { IconButton } from '@/components/icon-button/icon-button'
import { TableRowMenu } from '@/components/table-row-menu/table-row-menu'
import { formatCurrency } from '@/lib/utils'

export type BillOverviewStatus =
  | 'handled'
  | 'pending'
  | 'overdue'
  | 'upcoming'

export type BillOverviewDateFilterValue = {
  from?: string
  to?: string
}

export type BillOverviewAmountFilterValue = {
  min?: number
  max?: number
}

export type BillOverviewRow = {
  id: string
  billId: string | null
  dueDate: Date
  billName: string
  billSeriesName: string | null
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

type PresenceFilterValue = Array<'has' | 'doesNotHave'>

function presenceFilterPillValue(value: unknown, t: TFunction): string {
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

function billNameSearchText(row: BillOverviewRow): string {
  return [row.billName, row.billSeriesName].filter(Boolean).join(' ')
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
      filterFn: (row, _columnId, filterValue: BillOverviewDateFilterValue) => {
        const time = row.original.dueDate.getTime()
        if (filterValue.from && time < new Date(filterValue.from).getTime()) return false
        if (filterValue.to && time > new Date(filterValue.to).getTime()) return false
        return true
      },
      meta: {
        globalSearchable: false,
        filterable: true,
        filterLabel: t('common.date'),
        filterPillValue: (value: unknown) => {
          const v = value as BillOverviewDateFilterValue
          const parts: string[] = []
          if (v.from) parts.push(format(new Date(v.from), 'P', { locale: sv }))
          if (v.to) parts.push(format(new Date(v.to), 'P', { locale: sv }))
          return parts.join(' – ')
        }
      }
    },
    {
      id: 'billName',
      accessorKey: 'billName',
      header: t('common.bill'),
      cell: ({ row }) => (
        <span className="inline-flex max-w-full min-w-0 items-center gap-1">
          <span className="min-w-0 truncate">{row.original.billName}</span>
          {row.original.transactionConnected ? (
            <IconButton
              type="button"
              variant="text"
              color="primary"
              icon={<Link2 />}
              onClick={() => void 0}
              title={t('common.linkedTransaction')}
              aria-label={t('common.linkedTransaction')}
            />
          ) : null}
        </span>
      ),
      filterFn: (row, _columnId, filterValue: PresenceFilterValue) =>
        matchesPresenceFilter(row.original.transactionConnected, filterValue),
      meta: {
        globalSearchable: true,
        searchValue: (row: BillOverviewRow) => billNameSearchText(row),
        filterable: true,
        filterLabel: t('common.linkedTransaction'),
        filterPillValue: (value: unknown) => presenceFilterPillValue(value, t)
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
      filterFn: (row, _columnId, filterValue: BillOverviewStatus[]) => {
        return filterValue.includes(row.original.status)
      },
      meta: {
        globalSearchable: false,
        searchValue: (row) => statusLabel(row.status),
        filterable: true,
        filterLabel: t('bills.status'),
        filterPillValue: (value: unknown) => {
          if (!Array.isArray(value)) return ''
          return (value as BillOverviewStatus[]).map(statusLabel).join(', ')
        }
      }
    },
    {
      id: 'amount',
      accessorKey: 'amount',
      header: t('common.amount'),
      cell: ({ row }) => formatCurrency(row.original.amount),
      sortingFn: 'basic',
      filterFn: (row, _columnId, filterValue: BillOverviewAmountFilterValue) => {
        const amount = row.original.amount
        if (filterValue.min !== undefined && amount < filterValue.min) return false
        if (filterValue.max !== undefined && amount > filterValue.max) return false
        return true
      },
      meta: {
        globalSearchable: true,
        searchValue: (row: BillOverviewRow) =>
          `${String(row.amount)} ${formatCurrency(row.amount)}`,
        filterable: true,
        filterLabel: t('common.amount'),
        filterPillValue: (value: unknown) => {
          const v = value as BillOverviewAmountFilterValue
          const parts: string[] = []
          if (v.min !== undefined) parts.push(formatCurrency(v.min))
          if (v.max !== undefined) parts.push(formatCurrency(v.max))
          return parts.join(' – ')
        }
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
      filterFn: (row, _columnId, filterValue: BillPaymentHandling[]) => {
        const h = row.original.paymentHandling
        if (!h) return false
        return filterValue.includes(h)
      },
      meta: {
        globalSearchable: false,
        searchValue: (row: BillOverviewRow) =>
          row.paymentHandling ? handlingLabel(row.paymentHandling) : '',
        filterable: true,
        filterLabel: t('common.handling'),
        filterPillValue: (value: unknown) => {
          if (!Array.isArray(value)) return ''
          return (value as BillPaymentHandling[]).map(handlingLabel).join(', ')
        }
      }
    },
    {
      id: 'account',
      accessorKey: 'accountName',
      header: t('transfers.fromAccount'),
      cell: ({ row }) => row.original.accountName,
      filterFn: (row, _columnId, filterValue: string[]) => {
        return filterValue.includes(row.original.accountId ?? '')
      },
      meta: {
        globalSearchable: true,
        filterable: true,
        filterLabel: t('common.account'),
        filterPillValue: (value: unknown) => {
          if (!Array.isArray(value)) return ''
          const lookup = labelLookupRef.current.accounts
          return (value as string[]).map((id) => lookup.get(id) ?? id).join(', ')
        }
      }
    },
    {
      id: 'budget',
      accessorKey: 'budgetName',
      header: t('common.budget'),
      cell: ({ row }) => row.original.budgetName,
      filterFn: (row, _columnId, filterValue: string[]) => {
        return filterValue.includes(row.original.budgetId ?? '')
      },
      meta: {
        globalSearchable: true,
        filterable: true,
        filterLabel: t('common.budget'),
        filterPillValue: (value: unknown) => {
          if (!Array.isArray(value)) return ''
          const lookup = labelLookupRef.current.budgets
          return (value as string[]).map((id) => lookup.get(id) ?? id).join(', ')
        }
      }
    },
    {
      id: 'category',
      accessorKey: 'categoryName',
      header: t('common.category'),
      cell: ({ row }) => row.original.categoryName,
      filterFn: (row, _columnId, filterValue: string[]) => {
        return filterValue.includes(row.original.categoryId ?? '')
      },
      meta: {
        globalSearchable: true,
        filterable: true,
        filterLabel: t('common.category'),
        filterPillValue: (value: unknown) => {
          if (!Array.isArray(value)) return ''
          const lookup = labelLookupRef.current.categories
          return (value as string[]).map((id) => lookup.get(id) ?? id).join(', ')
        }
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
