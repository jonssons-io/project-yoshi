import { format } from 'date-fns'
import type { TFunction } from 'i18next'
import { ArrowRight, History, SquarePen, Trash2 } from 'lucide-react'
import type { MutableRefObject } from 'react'

import { BillPaymentHandling, RecurrenceType } from '@/api/generated/types.gen'
import type { BadgeColor } from '@/components/badge/badge'
import { Badge } from '@/components/badge/badge'
import type { DataTableColumnDef } from '@/components/data-table'
import { IconButton } from '@/components/icon-button/icon-button'
import {
  TableRowMenu,
  type TableRowMenuItem
} from '@/components/table-row-menu/table-row-menu'
import { formatCurrency } from '@/lib/utils'

export type BillBasisRow = {
  id: string
  name: string
  recurrenceType: RecurrenceType
  customIntervalDays: number | null | undefined
  dueDate: Date
  endDate: Date | undefined
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
  /** Logical revision count from the API (`GET …/revisions`); 1 = creation snapshot only. */
  numberOfRevisions: number
}

export const BILL_BASIS_NO_ACCOUNT_FILTER_VALUE = '__no_account__'
export const BILL_BASIS_NO_BUDGET_FILTER_VALUE = '__no_budget__'
export const BILL_BASIS_NO_CATEGORY_FILTER_VALUE = '__no_category__'

export type BillBasisLabelLookup = {
  accounts: Map<string, string>
  budgets: Map<string, string>
  categories: Map<string, string>
  recipients: Map<string, string>
}

type BillBasisDateFilterValue = {
  from?: string
  to?: string
}

type BillBasisAmountFilterValue = {
  min?: number
  max?: number
}

type PresenceFilterValue = Array<'has' | 'doesNotHave'>

function recurrenceLabel(
  type: RecurrenceType,
  customIntervalDays: number | null | undefined,
  t: TFunction
): string {
  switch (type) {
    case RecurrenceType.NONE:
      return t('bills.basisData.recurrence.none')
    case RecurrenceType.WEEKLY:
      return t('bills.basisData.recurrence.weekly')
    case RecurrenceType.MONTHLY:
      return t('bills.basisData.recurrence.monthly')
    case RecurrenceType.QUARTERLY:
      return t('bills.basisData.recurrence.quarterly')
    case RecurrenceType.YEARLY:
      return t('bills.basisData.recurrence.yearly')
    case RecurrenceType.CUSTOM:
      return t('bills.basisData.recurrence.custom', {
        days: customIntervalDays ?? 0
      })
    default:
      return type
  }
}

const RECURRENCE_ORDER: RecurrenceType[] = [
  RecurrenceType.NONE,
  RecurrenceType.WEEKLY,
  RecurrenceType.MONTHLY,
  RecurrenceType.QUARTERLY,
  RecurrenceType.YEARLY,
  RecurrenceType.CUSTOM
]

const HANDLING_BADGE_COLOR: Record<BillPaymentHandling, BadgeColor> = {
  [BillPaymentHandling.AUTOGIRO]: 'yellow',
  [BillPaymentHandling.E_INVOICE]: 'green',
  [BillPaymentHandling.MAIL]: 'teal',
  [BillPaymentHandling.PORTAL]: 'red',
  [BillPaymentHandling.PAPER]: 'orange'
}

export type CreateBillBasisColumnsParams = {
  t: TFunction
  labelLookupRef: MutableRefObject<BillBasisLabelLookup>
  onViewRevisions: (billId: string) => void
  onEditUpcoming: (billId: string) => void
  onEditAll: (billId: string) => void
  onDeleteBill: (billId: string) => void
}

function recurrenceFilterPillValue(value: unknown, t: TFunction): string {
  if (!Array.isArray(value)) return ''
  return (value as RecurrenceType[])
    .map((item) =>
      item === RecurrenceType.CUSTOM
        ? t('bills.basisData.recurrence.custom', {
            days: '?'
          })
        : recurrenceLabel(item, null, t)
    )
    .join(', ')
}

function presenceFilterPillValue(value: unknown, t: TFunction): string {
  if (!Array.isArray(value) || value.length !== 1) return ''
  return value[0] === 'has' ? t('common.has') : t('common.doesNotHave')
}

function matchesPresenceFilter(value: boolean, filterValue: unknown): boolean {
  if (!Array.isArray(filterValue) || filterValue.length !== 1) return true
  return filterValue[0] === 'has' ? value : !value
}

export function createBillBasisColumns({
  t,
  labelLookupRef,
  onViewRevisions,
  onEditUpcoming,
  onEditAll,
  onDeleteBill
}: CreateBillBasisColumnsParams): DataTableColumnDef<BillBasisRow>[] {
  const handlingLabel = (h: BillPaymentHandling) =>
    t(`bills.paymentHandling.${h}`)

  return [
    {
      id: 'revisions',
      enableSorting: false,
      header: t('bills.basisData.columns.revisions'),
      filterFn: (row, _columnId, filterValue: PresenceFilterValue) =>
        matchesPresenceFilter(row.original.numberOfRevisions > 1, filterValue),
      cell: ({ row }) => {
        if (row.original.numberOfRevisions <= 1) return null
        return (
          <IconButton
            type="button"
            variant="outlined"
            color="primary"
            icon={<History />}
            onClick={() => onViewRevisions(row.original.id)}
            title={t('bills.basisData.columns.revisions')}
            aria-label={t('bills.basisData.columns.revisions')}
          />
        )
      },
      meta: {
        globalSearchable: false,
        filterable: true,
        filterLabel: t('bills.basisData.columns.revisions'),
        filterPillValue: (value: unknown) => presenceFilterPillValue(value, t)
      }
    },
    {
      id: 'name',
      accessorKey: 'name',
      header: t('common.bill'),
      meta: {
        globalSearchable: true
      }
    },
    {
      id: 'amount',
      accessorKey: 'amount',
      header: t('common.amount'),
      cell: ({ row }) => formatCurrency(row.original.amount),
      sortingFn: 'basic',
      filterFn: (row, _columnId, filterValue: BillBasisAmountFilterValue) => {
        const amount = row.original.amount
        if (filterValue.min !== undefined && amount < filterValue.min)
          return false
        if (filterValue.max !== undefined && amount > filterValue.max)
          return false
        return true
      },
      meta: {
        globalSearchable: true,
        searchValue: (row: BillBasisRow) =>
          `${String(row.amount)} ${formatCurrency(row.amount)}`,
        filterable: true,
        filterLabel: t('common.amount'),
        filterPillValue: (value: unknown) => {
          const filter = value as BillBasisAmountFilterValue | undefined
          if (!filter) return ''
          const parts: string[] = []
          if (filter.min !== undefined)
            parts.push(`${t('common.from')}: ${formatCurrency(filter.min)}`)
          if (filter.max !== undefined)
            parts.push(`${t('common.to')}: ${formatCurrency(filter.max)}`)
          return parts.join(' – ')
        }
      }
    },
    {
      id: 'recurrence',
      accessorFn: (row) => row.recurrenceType,
      header: t('recurrence.label'),
      cell: ({ row }) =>
        recurrenceLabel(
          row.original.recurrenceType,
          row.original.customIntervalDays,
          t
        ),
      sortingFn: (rowA, rowB) =>
        RECURRENCE_ORDER.indexOf(rowA.original.recurrenceType) -
        RECURRENCE_ORDER.indexOf(rowB.original.recurrenceType),
      filterFn: (row, _columnId, filterValue: RecurrenceType[]) => {
        if (!Array.isArray(filterValue) || filterValue.length === 0) return true
        return filterValue.includes(row.original.recurrenceType)
      },
      meta: {
        globalSearchable: true,
        searchValue: (row: BillBasisRow) =>
          recurrenceLabel(row.recurrenceType, row.customIntervalDays, t),
        filterable: true,
        filterLabel: t('recurrence.label'),
        filterPillValue: (value: unknown) => recurrenceFilterPillValue(value, t)
      }
    },
    {
      id: 'period',
      accessorFn: (row) => row.dueDate.getTime(),
      header: t('bills.basisData.columns.period'),
      cell: ({ row }) => {
        const { dueDate, endDate, recurrenceType } = row.original
        const startStr = format(dueDate, 'yyyy-MM-dd')

        if (recurrenceType === RecurrenceType.NONE) {
          return <span>{startStr}</span>
        }

        return (
          <span className="inline-flex items-center gap-1.5">
            <span>{startStr}</span>
            <ArrowRight
              className="size-3.5 shrink-0 text-gray-600"
              strokeWidth={1.5}
              aria-hidden
            />
            {endDate ? <span>{format(endDate, 'yyyy-MM-dd')}</span> : null}
          </span>
        )
      },
      sortingFn: 'basic',
      filterFn: (row, _columnId, filterValue: BillBasisDateFilterValue) => {
        const start = row.original.dueDate.getTime()
        const end = (row.original.endDate ?? row.original.dueDate).getTime()
        if (filterValue.from && end < new Date(filterValue.from).getTime()) {
          return false
        }
        if (filterValue.to && start > new Date(filterValue.to).getTime()) {
          return false
        }
        return true
      },
      meta: {
        globalSearchable: false,
        filterable: true,
        filterLabel: t('common.date'),
        filterPillValue: (value: unknown) => {
          const filter = value as BillBasisDateFilterValue | undefined
          if (!filter) return ''
          const parts: string[] = []
          if (filter.from)
            parts.push(format(new Date(filter.from), 'yyyy-MM-dd'))
          if (filter.to) parts.push(format(new Date(filter.to), 'yyyy-MM-dd'))
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
        if (!Array.isArray(filterValue) || filterValue.length === 0) return true
        const handling = row.original.paymentHandling
        if (!handling) return false
        return filterValue.includes(handling)
      },
      meta: {
        globalSearchable: false,
        searchValue: (row: BillBasisRow) =>
          row.paymentHandling ? handlingLabel(row.paymentHandling) : '',
        filterable: true,
        filterLabel: t('common.handling'),
        filterPillValue: (value: unknown) => {
          if (!Array.isArray(value)) return ''
          return (value as BillPaymentHandling[])
            .map((item) => handlingLabel(item))
            .join(', ')
        }
      }
    },
    {
      id: 'account',
      accessorKey: 'accountName',
      header: t('transfers.fromAccount'),
      filterFn: (row, _columnId, filterValue: string[]) => {
        if (!Array.isArray(filterValue) || filterValue.length === 0) return true
        return filterValue.includes(
          row.original.accountId ?? BILL_BASIS_NO_ACCOUNT_FILTER_VALUE
        )
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
      accessorKey: 'budgetName',
      header: t('common.budget'),
      filterFn: (row, _columnId, filterValue: string[]) => {
        if (!Array.isArray(filterValue) || filterValue.length === 0) return true
        return filterValue.includes(
          row.original.budgetId ?? BILL_BASIS_NO_BUDGET_FILTER_VALUE
        )
      },
      meta: {
        globalSearchable: true,
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
      accessorKey: 'categoryName',
      header: t('common.category'),
      filterFn: (row, _columnId, filterValue: string[]) => {
        if (!Array.isArray(filterValue) || filterValue.length === 0) return true
        return filterValue.includes(
          row.original.categoryId ?? BILL_BASIS_NO_CATEGORY_FILTER_VALUE
        )
      },
      meta: {
        globalSearchable: true,
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
      filterFn: (row, _columnId, filterValue: string[]) => {
        if (!Array.isArray(filterValue) || filterValue.length === 0) return true
        return filterValue.includes(row.original.recipientId)
      },
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
      }
    },
    {
      id: 'actions',
      enableSorting: false,
      header: () => <span className="sr-only">{t('common.actions')}</span>,
      cell: ({ row }) => {
        const items: TableRowMenuItem[] = [
          {
            id: 'editUpcoming',
            label: t('bills.basisData.rowMenu.editUpcoming'),
            icon: <SquarePen />,
            onSelect: () => onEditUpcoming(row.original.id)
          },
          {
            id: 'editAll',
            label: t('bills.basisData.rowMenu.editAll'),
            icon: <SquarePen />,
            onSelect: () => onEditAll(row.original.id)
          }
        ]

        if (row.original.numberOfRevisions > 1) {
          items.push({
            id: 'viewRevisions',
            label: t('bills.basisData.rowMenu.viewRevisions'),
            icon: <History />,
            onSelect: () => onViewRevisions(row.original.id)
          })
        }

        items.push({
          id: 'delete',
          label: t('bills.basisData.rowMenu.delete'),
          icon: <Trash2 />,
          onSelect: () => onDeleteBill(row.original.id),
          destructive: true,
          separatorBefore: true
        })

        return (
          <TableRowMenu
            aria-label={t('common.actions')}
            items={items}
          />
        )
      },
      meta: {
        globalSearchable: false
      }
    }
  ]
}
