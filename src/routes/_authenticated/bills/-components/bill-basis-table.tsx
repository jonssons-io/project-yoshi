import { format } from 'date-fns'
import type { TFunction } from 'i18next'
import { ArrowRight, History, SquarePen, Trash2 } from 'lucide-react'

import { BillPaymentHandling, RecurrenceType } from '@/api/generated/types.gen'
import type { BadgeColor } from '@/components/badge/badge'
import { Badge } from '@/components/badge/badge'
import type { DataTableColumnDef } from '@/components/data-table'
import { IconButton } from '@/components/icon-button/icon-button'
import { TableRowMenu, type TableRowMenuItem } from '@/components/table-row-menu/table-row-menu'
import { formatCurrency } from '@/lib/utils'

export type BillBasisRow = {
  id: string
  name: string
  recurrenceType: RecurrenceType
  customIntervalDays: number | null | undefined
  startDate: Date
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
  hasRevisions: boolean
}

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
  onViewRevisions: (billId: string) => void
  onEditUpcoming: (billId: string) => void
  onEditAll: (billId: string) => void
  onDeleteBill: (billId: string) => void
}

export function createBillBasisColumns({
  t,
  onViewRevisions,
  onEditUpcoming,
  onEditAll,
  onDeleteBill
}: CreateBillBasisColumnsParams): DataTableColumnDef<BillBasisRow>[] {
  const handlingLabel = (h: BillPaymentHandling) => t(`bills.paymentHandling.${h}`)

  return [
    {
      id: 'revisions',
      enableSorting: false,
      header: t('bills.basisData.columns.revisions'),
      cell: ({ row }) => {
        if (!row.original.hasRevisions) return null
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
      meta: { globalSearchable: false }
    },
    {
      id: 'name',
      accessorKey: 'name',
      header: t('common.bill'),
      meta: { globalSearchable: true }
    },
    {
      id: 'amount',
      accessorKey: 'amount',
      header: t('common.amount'),
      cell: ({ row }) => formatCurrency(row.original.amount),
      sortingFn: 'basic',
      meta: {
        globalSearchable: true,
        searchValue: (row: BillBasisRow) =>
          `${String(row.amount)} ${formatCurrency(row.amount)}`
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
      meta: {
        globalSearchable: true,
        searchValue: (row: BillBasisRow) =>
          recurrenceLabel(row.recurrenceType, row.customIntervalDays, t)
      }
    },
    {
      id: 'period',
      accessorFn: (row) => row.startDate.getTime(),
      header: t('bills.basisData.columns.period'),
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
        searchValue: (row: BillBasisRow) =>
          row.paymentHandling ? handlingLabel(row.paymentHandling) : ''
      }
    },
    {
      id: 'account',
      accessorKey: 'accountName',
      header: t('transfers.fromAccount'),
      meta: { globalSearchable: true }
    },
    {
      id: 'budget',
      accessorKey: 'budgetName',
      header: t('common.budget'),
      meta: { globalSearchable: true }
    },
    {
      id: 'category',
      accessorKey: 'categoryName',
      header: t('common.category'),
      meta: { globalSearchable: true }
    },
    {
      id: 'recipient',
      accessorKey: 'recipientName',
      header: t('common.recipient'),
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

        if (row.original.hasRevisions) {
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
      meta: { globalSearchable: false }
    }
  ]
}
