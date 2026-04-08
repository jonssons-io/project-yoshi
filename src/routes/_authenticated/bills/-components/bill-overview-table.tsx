import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import type { TFunction } from 'i18next'
import { ArrowLeftRight, BookUp, Link, Link2, SquarePen } from 'lucide-react'
import type { MutableRefObject } from 'react'

import {
  BillInstanceStatus,
  BillPaymentHandling
} from '@/api/generated/types.gen'
import type { BadgeColor } from '@/components/badge/badge'
import { Badge } from '@/components/badge/badge'
import type { DataTableColumnDef } from '@/components/data-table'
import { IconButton } from '@/components/icon-button/icon-button'
import {
  SplitLinesTableCell,
  splitLinesSortKey,
  splitLinesToolbarSearchText
} from '@/components/split-lines-table-cell/split-lines-table-cell'
import { TableRowMenu } from '@/components/table-row-menu/table-row-menu'
import { formatCurrency } from '@/lib/utils'

export type BillOverviewStatus = 'handled' | 'paid' | 'overdue' | 'upcoming'

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
  /** Positive when the instance uses per-line splits (no single top-level category). */
  splitLineCount: number
  /** Budget ids from split lines (top-level `budgetId` is null when splits are used). */
  splitBudgetIds: string[]
  /** Category ids from split lines. */
  splitCategoryIds: string[]
  /** Display names for `splitCategoryIds` (filter dropdown labels). */
  splitCategoryLabels: Record<string, string>
  /** Display names for `splitBudgetIds` (filter dropdown + search), from nested split `budget` when present. */
  splitBudgetLabels: Record<string, string>
  /** Split-badge tooltip for the budget column (budget per line). */
  splitLinesTooltipBudget: string
  /** Split-badge tooltip for the category column (category per line). */
  splitLinesTooltipCategory: string
  /** Precomputed search text for category column when splits are used. */
  splitCategorySearchBlob: string
  /** Precomputed search text for budget column when splits are used. */
  splitBudgetSearchBlob: string
  /**
   * Line payloads when the instance uses splits — used to prefill “create transaction” from this row.
   */
  splitPrefillLines: Array<{
    subtitle: string
    amount: number
    budgetId: string | null
    categoryId: string
  }>
  recipientId: string
  recipientName: string
}

export function mapBillOverviewStatus(
  apiStatus: BillInstanceStatus
): BillOverviewStatus {
  switch (apiStatus) {
    case BillInstanceStatus.HANDLED:
      return 'handled'
    case BillInstanceStatus.PAID:
      return 'paid'
    case BillInstanceStatus.OVERDUE:
      return 'overdue'
    default:
      return 'upcoming'
  }
}

const STATUS_BADGE_COLOR: Record<BillOverviewStatus, BadgeColor> = {
  upcoming: 'gray',
  overdue: 'red',
  handled: 'blue',
  paid: 'green'
}

const HANDLING_BADGE_COLOR: Record<BillPaymentHandling, BadgeColor> = {
  [BillPaymentHandling.AUTOGIRO]: 'yellow',
  [BillPaymentHandling.E_INVOICE]: 'green',
  [BillPaymentHandling.MAIL]: 'teal',
  [BillPaymentHandling.PORTAL]: 'red',
  [BillPaymentHandling.PAPER]: 'orange',
  [BillPaymentHandling.CARD]: 'lilac'
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

function matchesPresenceFilter(value: boolean, filterValue: unknown): boolean {
  if (!Array.isArray(filterValue) || filterValue.length !== 1) return true
  return filterValue[0] === 'has' ? value : !value
}

function billNameSearchText(row: BillOverviewRow): string {
  return [
    row.billName,
    row.billSeriesName
  ]
    .filter(Boolean)
    .join(' ')
}

function billOverviewBudgetIdSet(row: BillOverviewRow): Set<string> {
  const ids = new Set<string>()
  if (row.budgetId) ids.add(row.budgetId)
  for (const id of row.splitBudgetIds) ids.add(id)
  return ids
}

function billOverviewCategoryIdSet(row: BillOverviewRow): Set<string> {
  const ids = new Set<string>()
  if (row.categoryId) ids.add(row.categoryId)
  for (const id of row.splitCategoryIds) ids.add(id)
  return ids
}

function billOverviewBudgetFilterMatch(
  row: BillOverviewRow,
  filterValue: string[]
): boolean {
  if (!Array.isArray(filterValue) || filterValue.length === 0) return true
  const ids = billOverviewBudgetIdSet(row)
  return filterValue.some((sel) => {
    if (sel === '') return ids.size === 0
    return ids.has(sel)
  })
}

function billOverviewCategoryFilterMatch(
  row: BillOverviewRow,
  filterValue: string[]
): boolean {
  if (!Array.isArray(filterValue) || filterValue.length === 0) return true
  const ids = billOverviewCategoryIdSet(row)
  return filterValue.some((sel) => {
    if (sel === '') return ids.size === 0
    return ids.has(sel)
  })
}

export function createBillOverviewColumns(opts: {
  t: TFunction
  labelLookupRef: MutableRefObject<LabelLookup>
  onEditBillInstance: (instanceId: string) => void
  onCreateTransaction: (row: BillOverviewRow) => void
}): DataTableColumnDef<BillOverviewRow>[] {
  const { t, labelLookupRef, onEditBillInstance, onCreateTransaction } = opts
  const comingSoonTitle = t('common.comingSoonTooltip')
  const statusLabel = (s: BillOverviewStatus) => t(`bills.status_.${s}`)
  const handlingLabel = (h: BillPaymentHandling) =>
    t(`bills.paymentHandling.${h}`)

  return [
    {
      id: 'dueDate',
      accessorFn: (row) => row.dueDate.getTime(),
      header: t('common.dueDate'),
      cell: ({ row }) =>
        format(row.original.dueDate, 'P', {
          locale: sv
        }),
      sortingFn: 'basic',
      filterFn: (row, _columnId, filterValue: BillOverviewDateFilterValue) => {
        const time = row.original.dueDate.getTime()
        if (filterValue.from && time < new Date(filterValue.from).getTime())
          return false
        if (filterValue.to && time > new Date(filterValue.to).getTime())
          return false
        return true
      },
      meta: {
        globalSearchable: false,
        filterable: true,
        filterLabel: t('common.date'),
        filterPillValue: (value: unknown) => {
          const v = value as BillOverviewDateFilterValue
          const parts: string[] = []
          if (v.from)
            parts.push(
              format(new Date(v.from), 'P', {
                locale: sv
              })
            )
          if (v.to)
            parts.push(
              format(new Date(v.to), 'P', {
                locale: sv
              })
            )
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
          'overdue',
          'upcoming',
          'handled',
          'paid'
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
      filterFn: (
        row,
        _columnId,
        filterValue: BillOverviewAmountFilterValue
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
          return (value as string[])
            .map((id) => lookup.get(id) ?? id)
            .join(', ')
        }
      }
    },
    {
      id: 'budget',
      accessorFn: (row) =>
        splitLinesSortKey(row.splitLineCount, row.budgetName),
      header: t('common.budget'),
      sortingFn: (rowA, rowB) =>
        splitLinesSortKey(
          rowA.original.splitLineCount,
          rowA.original.budgetName
        ).localeCompare(
          splitLinesSortKey(
            rowB.original.splitLineCount,
            rowB.original.budgetName
          ),
          undefined,
          {
            numeric: true
          }
        ),
      cell: ({ row }) =>
        row.original.splitLineCount > 0 ? (
          <SplitLinesTableCell
            lineCount={row.original.splitLineCount}
            t={t}
            title={row.original.splitLinesTooltipBudget}
          />
        ) : (
          row.original.budgetName
        ),
      filterFn: (row, _columnId, filterValue: string[]) =>
        billOverviewBudgetFilterMatch(row.original, filterValue),
      meta: {
        globalSearchable: true,
        searchValue: (row: BillOverviewRow) =>
          [
            splitLinesToolbarSearchText(row.splitLineCount, t),
            row.splitLineCount > 0 ? row.splitBudgetSearchBlob : '',
            row.budgetName
          ]
            .filter(Boolean)
            .join(' '),
        filterable: true,
        filterLabel: t('common.budget'),
        filterPillValue: (value: unknown) => {
          if (!Array.isArray(value)) return ''
          const lookup = labelLookupRef.current.budgets
          return (value as string[])
            .map((id) => lookup.get(id) ?? id)
            .join(', ')
        }
      }
    },
    {
      id: 'category',
      accessorFn: (row) =>
        splitLinesSortKey(row.splitLineCount, row.categoryName),
      header: t('common.category'),
      sortingFn: (rowA, rowB) =>
        splitLinesSortKey(
          rowA.original.splitLineCount,
          rowA.original.categoryName
        ).localeCompare(
          splitLinesSortKey(
            rowB.original.splitLineCount,
            rowB.original.categoryName
          ),
          undefined,
          {
            numeric: true
          }
        ),
      cell: ({ row }) =>
        row.original.splitLineCount > 0 ? (
          <SplitLinesTableCell
            lineCount={row.original.splitLineCount}
            t={t}
            title={row.original.splitLinesTooltipCategory}
          />
        ) : (
          <span>{row.original.categoryName}</span>
        ),
      filterFn: (row, _columnId, filterValue: string[]) =>
        billOverviewCategoryFilterMatch(row.original, filterValue),
      meta: {
        globalSearchable: true,
        searchValue: (row: BillOverviewRow) =>
          [
            splitLinesToolbarSearchText(row.splitLineCount, t),
            row.splitLineCount > 0 ? row.splitCategorySearchBlob : '',
            row.categoryName
          ]
            .filter(Boolean)
            .join(' '),
        filterable: true,
        filterLabel: t('common.category'),
        filterPillValue: (value: unknown) => {
          if (!Array.isArray(value)) return ''
          const lookup = labelLookupRef.current.categories
          return (value as string[])
            .map((id) => lookup.get(id) ?? id)
            .join(', ')
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
                      disabledReason: t(
                        'bills.overviewRowMenu.editDisabledTooltip'
                      ),
                      onSelect: () => onEditBillInstance(row.original.id)
                    },
                    {
                      id: 'viewTransaction',
                      label: t('bills.overviewRowMenu.viewTransaction'),
                      icon: <Link />,
                      comingSoon: true,
                      disabledReason: comingSoonTitle,
                      onSelect: () => void 0
                    },
                    {
                      id: 'viewBasis',
                      label: t('bills.overviewRowMenu.viewBasis'),
                      icon: <BookUp />,
                      comingSoon: true,
                      disabledReason: comingSoonTitle,
                      onSelect: () => void 0
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
                      comingSoon: true,
                      disabledReason: comingSoonTitle,
                      onSelect: () => void 0
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
