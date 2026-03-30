import { format } from 'date-fns'
import type { TFunction } from 'i18next'
import { ArrowRight, History, SquarePen, Trash2 } from 'lucide-react'

import { RecurrenceType } from '@/api/generated/types.gen'
import type { DataTableColumnDef } from '@/components/data-table'
import { IconButton } from '@/components/icon-button/icon-button'
import { TableRowMenu, type TableRowMenuItem } from '@/components/table-row-menu/table-row-menu'
import { formatCurrency } from '@/lib/utils'

export type IncomeSourceDataRow = {
  id: string
  name: string
  recurrenceType: RecurrenceType
  customIntervalDays: number | null | undefined
  startDate: Date
  endDate: Date | undefined
  amount: number
  accountId: string
  accountName: string
  categoryId: string
  categoryName: string
  senderId: string
  senderName: string
  /** True when the income blueprint has been revised (e.g. amount changed). Requires backend support. */
  hasRevisions: boolean
}

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
  onViewRevisions: (incomeId: string) => void
  onEditUpcoming: (incomeId: string) => void
  onEditAll: (incomeId: string) => void
  onDeleteIncome: (incomeId: string) => void
}

export function createIncomeSourceDataColumns({
  t,
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
      cell: ({ row }) => {
        if (!row.original.hasRevisions) return null
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
      meta: { globalSearchable: false }
    },
    {
      id: 'name',
      accessorKey: 'name',
      header: t('forms.transactionName'),
      meta: { globalSearchable: true }
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
      meta: {
        globalSearchable: true,
        searchValue: (row: IncomeSourceDataRow) =>
          recurrenceLabel(row.recurrenceType, row.customIntervalDays, t)
      }
    },
    {
      id: 'period',
      accessorFn: (row) => row.startDate.getTime(),
      header: t('income.sourceData.columns.period'),
      cell: ({ row }) => {
        const { startDate, endDate, recurrenceType } = row.original
        const startStr = format(startDate, 'yyyy-MM-dd')

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
      meta: { globalSearchable: false }
    },
    {
      id: 'amount',
      accessorKey: 'amount',
      header: t('common.amount'),
      cell: ({ row }) => formatCurrency(row.original.amount),
      sortingFn: 'basic',
      meta: {
        globalSearchable: true,
        searchValue: (row: IncomeSourceDataRow) =>
          `${String(row.amount)} ${formatCurrency(row.amount)}`
      }
    },
    {
      id: 'account',
      accessorKey: 'accountName',
      header: t('common.account'),
      meta: { globalSearchable: true }
    },
    {
      id: 'category',
      accessorKey: 'categoryName',
      header: t('common.category'),
      meta: { globalSearchable: true }
    },
    {
      id: 'sender',
      accessorKey: 'senderName',
      header: t('income.sender'),
      meta: { globalSearchable: true }
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

        if (row.original.hasRevisions) {
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
      meta: { globalSearchable: false }
    }
  ]
}
