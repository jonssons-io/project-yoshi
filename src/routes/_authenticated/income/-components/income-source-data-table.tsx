import { format } from 'date-fns'
import type { TFunction } from 'i18next'
import { ArrowRight, History, SquarePen, Trash2 } from 'lucide-react'
import type { MutableRefObject } from 'react'

import { RecurrenceType } from '@/api/generated/types.gen'
import type { DataTableColumnDef } from '@/components/data-table'
import { IconButton } from '@/components/icon-button/icon-button'
import {
  TableRowMenu,
  type TableRowMenuItem
} from '@/components/table-row-menu/table-row-menu'
import { formatCurrency } from '@/lib/utils'

export type IncomeSourceDataRow = {
  id: string
  name: string
  recurrenceType: RecurrenceType
  customIntervalDays: number | null | undefined
  expectedDate: Date
  endDate: Date | undefined
  amount: number
  accountId: string
  accountName: string
  categoryId: string
  categoryName: string
  senderId: string
  senderName: string
  /** Logical revision count from the API (`GET …/revisions`); 1 = creation snapshot only. */
  numberOfRevisions: number
}

export type IncomeSourceLabelLookup = {
  accounts: Map<string, string>
  categories: Map<string, string>
  senders: Map<string, string>
}

type IncomeSourceDateFilterValue = {
  from?: string
  to?: string
}

type IncomeSourceAmountFilterValue = {
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
      return t('income.sourceData.recurrence.none')
    case RecurrenceType.WEEKLY:
      return t('income.sourceData.recurrence.weekly')
    case RecurrenceType.MONTHLY:
      return t('income.sourceData.recurrence.monthly')
    case RecurrenceType.QUARTERLY:
      return t('income.sourceData.recurrence.quarterly')
    case RecurrenceType.YEARLY:
      return t('income.sourceData.recurrence.yearly')
    case RecurrenceType.CUSTOM:
      return t('income.sourceData.recurrence.custom', {
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

export type CreateIncomeSourceDataColumnsParams = {
  t: TFunction
  labelLookupRef: MutableRefObject<IncomeSourceLabelLookup>
  onViewRevisions: (incomeId: string) => void
  onEditUpcoming: (incomeId: string) => void
  onEditAll: (incomeId: string) => void
  onDeleteIncome: (incomeId: string) => void
}

function recurrenceFilterPillValue(value: unknown, t: TFunction): string {
  if (!Array.isArray(value)) return ''
  return (value as RecurrenceType[])
    .map((item) =>
      item === RecurrenceType.CUSTOM
        ? t('income.sourceData.recurrence.custom', {
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

export function createIncomeSourceDataColumns({
  t,
  labelLookupRef,
  onViewRevisions,
  onEditUpcoming,
  onEditAll,
  onDeleteIncome
}: CreateIncomeSourceDataColumnsParams): DataTableColumnDef<IncomeSourceDataRow>[] {
  return [
    {
      id: 'revisions',
      enableSorting: false,
      header: t('income.sourceData.columns.revisions'),
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
            title={t('income.sourceData.columns.revisions')}
            aria-label={t('income.sourceData.columns.revisions')}
          />
        )
      },
      meta: {
        globalSearchable: false,
        filterable: true,
        filterLabel: t('income.sourceData.columns.revisions'),
        filterPillValue: (value: unknown) => presenceFilterPillValue(value, t)
      }
    },
    {
      id: 'name',
      accessorKey: 'name',
      header: t('forms.transactionName'),
      meta: {
        globalSearchable: true
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
        searchValue: (row: IncomeSourceDataRow) =>
          recurrenceLabel(row.recurrenceType, row.customIntervalDays, t),
        filterable: true,
        filterLabel: t('recurrence.label'),
        filterPillValue: (value: unknown) => recurrenceFilterPillValue(value, t)
      }
    },
    {
      id: 'period',
      accessorFn: (row) => row.expectedDate.getTime(),
      header: t('income.sourceData.columns.period'),
      cell: ({ row }) => {
        const { expectedDate, endDate, recurrenceType } = row.original
        const startStr = format(expectedDate, 'yyyy-MM-dd')

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
      filterFn: (row, _columnId, filterValue: IncomeSourceDateFilterValue) => {
        const start = row.original.expectedDate.getTime()
        const end = (
          row.original.endDate ?? row.original.expectedDate
        ).getTime()
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
          const filter = value as IncomeSourceDateFilterValue | undefined
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
      id: 'amount',
      accessorKey: 'amount',
      header: t('common.amount'),
      cell: ({ row }) => formatCurrency(row.original.amount),
      sortingFn: 'basic',
      filterFn: (
        row,
        _columnId,
        filterValue: IncomeSourceAmountFilterValue
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
        searchValue: (row: IncomeSourceDataRow) =>
          `${String(row.amount)} ${formatCurrency(row.amount)}`,
        filterable: true,
        filterLabel: t('common.amount'),
        filterPillValue: (value: unknown) => {
          const filter = value as IncomeSourceAmountFilterValue | undefined
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
      id: 'account',
      accessorKey: 'accountName',
      header: t('common.account'),
      filterFn: (row, _columnId, filterValue: string[]) => {
        if (!Array.isArray(filterValue) || filterValue.length === 0) return true
        return filterValue.includes(row.original.accountId)
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
      id: 'category',
      accessorKey: 'categoryName',
      header: t('common.category'),
      filterFn: (row, _columnId, filterValue: string[]) => {
        if (!Array.isArray(filterValue) || filterValue.length === 0) return true
        return filterValue.includes(row.original.categoryId)
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
      id: 'sender',
      accessorKey: 'senderName',
      header: t('income.sender'),
      filterFn: (row, _columnId, filterValue: string[]) => {
        if (!Array.isArray(filterValue) || filterValue.length === 0) return true
        return filterValue.includes(row.original.senderId)
      },
      meta: {
        globalSearchable: true,
        filterable: true,
        filterLabel: t('income.sender'),
        filterPillValue: (value: unknown) => {
          if (!Array.isArray(value)) return ''
          const lookup = labelLookupRef.current.senders
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
            label: t('income.sourceData.rowMenu.editUpcoming'),
            icon: <SquarePen />,
            onSelect: () => onEditUpcoming(row.original.id)
          },
          {
            id: 'editAll',
            label: t('income.sourceData.rowMenu.editAll'),
            icon: <SquarePen />,
            onSelect: () => onEditAll(row.original.id)
          }
        ]

        if (row.original.numberOfRevisions > 1) {
          items.push({
            id: 'viewRevisions',
            label: t('income.sourceData.rowMenu.viewRevisions'),
            icon: <History />,
            onSelect: () => onViewRevisions(row.original.id)
          })
        }

        items.push({
          id: 'delete',
          label: t('income.sourceData.rowMenu.delete'),
          icon: <Trash2 />,
          onSelect: () => onDeleteIncome(row.original.id),
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
