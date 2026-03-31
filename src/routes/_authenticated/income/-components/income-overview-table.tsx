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

import type { BadgeColor } from '@/components/badge/badge'
import { Badge } from '@/components/badge/badge'
import type { DataTableColumnDef } from '@/components/data-table'
import { IconButton } from '@/components/icon-button/icon-button'
import { TableRowMenu } from '@/components/table-row-menu/table-row-menu'
import { formatCurrency } from '@/lib/utils'

export type IncomeOverviewStatus =
  | 'handled'
  | 'pending'
  | 'overdue'
  | 'upcoming'

export type IncomeDateFilterValue = {
  from?: string
  to?: string
}

export type IncomeAmountFilterValue = {
  min?: number
  max?: number
}

export type IncomeOverviewRow = {
  id: string
  expectedDate: Date
  incomeName: string
  incomeSeriesName: string | null
  status: IncomeOverviewStatus
  /** True when this instance is linked to a transaction (`transaction` relation set). */
  transactionConnected: boolean
  amount: number
  accountId: string
  accountName: string
  categoryId: string | null
  categoryName: string
  senderId: string
  senderName: string
}

export function deriveIncomeOverviewStatus(
  hasTransaction: boolean,
  datePassed: boolean
): IncomeOverviewStatus {
  if (hasTransaction && datePassed) return 'handled'
  if (hasTransaction) return 'pending'
  if (datePassed) return 'overdue'
  return 'upcoming'
}

const STATUS_BADGE_COLOR: Record<IncomeOverviewStatus, BadgeColor> = {
  upcoming: 'gray',
  overdue: 'red',
  pending: 'blue',
  handled: 'green'
}

export type LabelLookup = {
  accounts: Map<string, string>
  categories: Map<string, string>
  senders: Map<string, string>
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

function incomeNameSearchText(row: IncomeOverviewRow): string {
  return [row.incomeName, row.incomeSeriesName].filter(Boolean).join(' ')
}

/**
 * Builds column definitions for the income overview data table.
 * Uses a ref for data-dependent label lookups so columns stay referentially
 * stable (only depend on `t`).
 */
export function createIncomeOverviewColumns(opts: {
  t: TFunction
  labelLookupRef: MutableRefObject<LabelLookup>
  onEditIncomeInstance: (instanceId: string) => void
  onCreateTransaction: (row: IncomeOverviewRow) => void
}): DataTableColumnDef<IncomeOverviewRow>[] {
  const { t, labelLookupRef, onEditIncomeInstance, onCreateTransaction } = opts
  const statusLabel = (s: IncomeOverviewStatus) => t(`income.status.${s}`)

  return [
    {
      id: 'expectedDate',
      accessorFn: (row) => row.expectedDate.getTime(),
      header: t('common.date'),
      cell: ({ row }) =>
        format(row.original.expectedDate, 'P', {
          locale: sv
        }),
      sortingFn: 'basic',
      meta: {
        globalSearchable: false,
        filterable: true,
        filterLabel: t('common.date'),
        filterPillValue: (value: unknown) => {
          const v = value as IncomeDateFilterValue | undefined
          if (!v) return ''
          const parts: string[] = []
          if (v.from)
            parts.push(
              `${t('common.from')}: ${format(new Date(v.from), 'P', {
                locale: sv
              })}`
            )
          if (v.to)
            parts.push(
              `${t('common.to')}: ${format(new Date(v.to), 'P', {
                locale: sv
              })}`
            )
          return parts.join(' – ')
        }
      },
      filterFn: (row, _columnId, filterValue: IncomeDateFilterValue) => {
        const ts = row.original.expectedDate.getTime()
        if (filterValue.from && ts < new Date(filterValue.from).getTime())
          return false
        if (filterValue.to && ts > new Date(filterValue.to).getTime())
          return false
        return true
      }
    },
    {
      id: 'incomeName',
      accessorKey: 'incomeName',
      header: t('income.name'),
      cell: ({ row }) => (
        <span className="inline-flex max-w-full min-w-0 items-center gap-1">
          <span className="min-w-0 truncate">{row.original.incomeName}</span>
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
        searchValue: (row) => incomeNameSearchText(row),
        filterable: true,
        filterLabel: t('common.linkedTransaction'),
        filterPillValue: (value: unknown) => presenceFilterPillValue(value, t)
      }
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: t('transactions.status'),
      cell: ({ row }) => (
        <Badge
          color={STATUS_BADGE_COLOR[row.original.status]}
          label={statusLabel(row.original.status)}
        />
      ),
      sortingFn: (rowA, rowB) => {
        const order: IncomeOverviewStatus[] = [
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
        searchValue: (row) => statusLabel(row.status),
        filterable: true,
        filterLabel: t('transactions.status'),
        filterPillValue: (value: unknown) => {
          if (!Array.isArray(value)) return ''
          return (value as IncomeOverviewStatus[]).map(statusLabel).join(', ')
        }
      },
      filterFn: (row, _columnId, filterValue: IncomeOverviewStatus[]) => {
        return filterValue.includes(row.original.status)
      }
    },
    {
      id: 'amount',
      accessorKey: 'amount',
      header: t('common.amount'),
      cell: ({ row }) => formatCurrency(row.original.amount),
      sortingFn: 'basic',
      meta: {
        globalSearchable: false,
        filterable: true,
        filterLabel: t('common.amount'),
        filterPillValue: (value: unknown) => {
          const v = value as IncomeAmountFilterValue | undefined
          if (!v) return ''
          const parts: string[] = []
          if (v.min !== undefined)
            parts.push(`${t('common.from')}: ${formatCurrency(v.min)}`)
          if (v.max !== undefined)
            parts.push(`${t('common.to')}: ${formatCurrency(v.max)}`)
          return parts.join(' – ')
        }
      },
      filterFn: (row, _columnId, filterValue: IncomeAmountFilterValue) => {
        const amount = row.original.amount
        if (filterValue.min !== undefined && amount < filterValue.min)
          return false
        if (filterValue.max !== undefined && amount > filterValue.max)
          return false
        return true
      }
    },
    {
      id: 'account',
      accessorKey: 'accountName',
      header: t('common.account'),
      cell: ({ row }) => row.original.accountName,
      meta: {
        globalSearchable: false,
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
      filterFn: (row, _columnId, filterValue: string[]) => {
        return filterValue.includes(row.original.accountId)
      }
    },
    {
      id: 'category',
      accessorKey: 'categoryName',
      header: t('common.category'),
      cell: ({ row }) => row.original.categoryName,
      meta: {
        globalSearchable: false,
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
      filterFn: (row, _columnId, filterValue: string[]) => {
        return filterValue.includes(
          row.original.categoryId ?? '__uncategorized__'
        )
      }
    },
    {
      id: 'sender',
      accessorKey: 'senderName',
      header: t('income.sender'),
      cell: ({ row }) => row.original.senderName,
      meta: {
        globalSearchable: false,
        filterable: true,
        filterLabel: t('income.sender'),
        filterPillValue: (value: unknown) => {
          if (!Array.isArray(value)) return ''
          const lookup = labelLookupRef.current.senders
          return (value as string[])
            .map((id) => lookup.get(id) ?? id)
            .join(', ')
        }
      },
      filterFn: (row, _columnId, filterValue: string[]) => {
        return filterValue.includes(row.original.senderId)
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
            items={[
              {
                id: 'transaction',
                label: connected
                  ? t('income.overviewRowMenu.viewTransaction')
                  : t('income.createTransaction'),
                icon: connected ? <Link /> : <ArrowLeftRight />,
                onSelect: connected
                  ? () => void 0
                  : () => onCreateTransaction(row.original)
              },
              {
                id: 'edit',
                label: t('income.overviewRowMenu.editIncome'),
                icon: <SquarePen />,
                disabled: connected,
                disabledReason: connected
                  ? 'Du kan inte editera denna inkomst då det finns en transaktion kopplad till den.'
                  : undefined,
                onSelect: () => {
                  onEditIncomeInstance(row.original.id)
                }
              },
              {
                id: 'documentation',
                label: t('income.overviewRowMenu.viewDocumentation'),
                icon: <BookUp />,
                onSelect: () => void 0
              },
              {
                id: 'delete',
                label: t('income.overviewRowMenu.deleteIncome'),
                icon: <Trash2 className="text-red-500" />,
                onSelect: () => void 0,
                destructive: true,
                separatorBefore: true
              }
            ]}
          />
        )
      },
      meta: {
        globalSearchable: false
      }
    }
  ]
}
