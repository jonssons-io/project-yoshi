import type { ColumnDef } from '@tanstack/react-table'
import type { TFunction } from 'i18next'
import { ArchiveIcon, ArchiveRestoreIcon, PencilIcon } from 'lucide-react'
import type { RefObject } from 'react'

import type { CategoryType } from '@/api/generated/types.gen'
import { Badge } from '@/components/badge/badge'
import type { DataTableColumnDef } from '@/components/data-table'
import { IconButton } from '@/components/icon-button/icon-button'
import {
  TableRowMenu,
  type TableRowMenuItem
} from '@/components/table-row-menu/table-row-menu'

/** Turn off if the deployed API removes category archive. */
const categoryArchiveSupported = true

/** Internal `archived` column filter values (Ja / Nej in the UI). */
export const categoryArchivedFilterYes = 'yes'
export const categoryArchivedFilterNo = 'no'

export type LinkedBudgetRef = {
  id: string
  name: string
}

export type CategoryTableRow = {
  id: string
  name: string
  types: CategoryType[]
  archived: boolean
  _count?: {
    transactions?: number
    budgets?: number
  }
  linkedBudgets: LinkedBudgetRef[]
}

export type CategoryColumnLabelLookup = {
  budgets: Map<string, string>
}

function typeLabel(t: TFunction, type: CategoryType): string {
  return type === 'INCOME' ? t('categories.income') : t('categories.expense')
}

function typesFilterFn(
  row: {
    original: CategoryTableRow
  },
  _columnId: string,
  filterValue: unknown
): boolean {
  const selected = filterValue as CategoryType[] | undefined
  if (!selected?.length) return true
  return selected.some((ty) => row.original.types.includes(ty))
}

function budgetsFilterFn(
  row: {
    original: CategoryTableRow
  },
  _columnId: string,
  filterValue: unknown
): boolean {
  const selected = filterValue as string[] | undefined
  if (!selected?.length) return true
  return row.original.linkedBudgets.some((b) => selected.includes(b.id))
}

function archivedColumnFilterFn(
  row: {
    original: CategoryTableRow
  },
  _columnId: string,
  filterValue: unknown
): boolean {
  const selected = filterValue as string[] | undefined
  if (!selected?.length) return true
  const wantsYes = selected.includes(categoryArchivedFilterYes)
  const wantsNo = selected.includes(categoryArchivedFilterNo)
  if (wantsYes && wantsNo) return true
  if (wantsYes) return row.original.archived
  if (wantsNo) return !row.original.archived
  return true
}

export function createCategoriesTableColumns(params: {
  t: TFunction
  labelLookupRef: RefObject<CategoryColumnLabelLookup>
  onEdit: (row: CategoryTableRow) => void
  onArchive: (row: CategoryTableRow, archived: boolean) => void
}): DataTableColumnDef<CategoryTableRow>[] {
  const { t, labelLookupRef, onEdit, onArchive } = params

  return [
    {
      accessorKey: 'name',
      header: t('common.category'),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
      meta: {
        globalSearchable: true,
        searchValue: (r) => r.name
      }
    },
    {
      id: 'categoryTypes',
      accessorFn: (r) => r.types.join(','),
      header: t('categories.type'),
      cell: ({ row }) => (
        <span className="flex flex-row flex-wrap gap-1">
          {row.original.types.map((ty) => (
            <Badge
              key={ty}
              color={ty === 'INCOME' ? 'green' : 'red'}
              label={typeLabel(t, ty)}
            />
          ))}
        </span>
      ),
      meta: {
        globalSearchable: false,
        searchValue: (r) => r.types.map((ty) => typeLabel(t, ty)).join(' '),
        filterable: true,
        filterLabel: t('categories.type'),
        filterPillValue: (value) => {
          const arr = value as CategoryType[]
          if (!Array.isArray(arr) || arr.length === 0) return ''
          return arr.map((ty) => typeLabel(t, ty)).join(', ')
        }
      },
      filterFn: typesFilterFn as ColumnDef<
        CategoryTableRow,
        unknown
      >['filterFn']
    },
    {
      id: 'budgetIds',
      accessorFn: (r) => r.linkedBudgets.map((b) => b.name).join(' '),
      header: t('categories.budgets'),
      cell: ({ row }) => {
        const linked = row.original.linkedBudgets
        if (linked.length === 0) {
          return (
            <span className="type-body-small text-muted-foreground">
              {'\u2014'}
            </span>
          )
        }
        return (
          <span className="flex flex-row flex-wrap gap-x-2 gap-y-1">
            {linked.map((b) => (
              <span
                key={b.id}
                className="type-body-small text-foreground"
              >
                {b.name}
              </span>
            ))}
          </span>
        )
      },
      meta: {
        globalSearchable: false,
        searchValue: (r) =>
          r.linkedBudgets
            .map((b) => labelLookupRef.current.budgets.get(b.id) ?? b.name)
            .join(' '),
        filterable: true,
        filterLabel: t('categories.budgets'),
        filterPillValue: (value) => {
          const ids = value as string[]
          if (!Array.isArray(ids) || ids.length === 0) return ''
          return ids
            .map((id) => labelLookupRef.current.budgets.get(id) ?? id)
            .join(', ')
        }
      },
      filterFn: budgetsFilterFn as ColumnDef<
        CategoryTableRow,
        unknown
      >['filterFn']
    },
    {
      id: 'archived',
      accessorFn: (r) => (r.archived ? 1 : 0),
      header: t('common.archived'),
      cell: ({ row }) => {
        const c = row.original
        if (!c.archived) {
          return null
        }
        if (!categoryArchiveSupported) {
          return (
            <span className="type-body-small text-muted-foreground">
              {t('common.yes')}
            </span>
          )
        }
        return (
          <IconButton
            variant="text"
            color="primary"
            aria-label={t('common.unarchive')}
            title={t('common.unarchive')}
            icon={
              <ArchiveRestoreIcon
                className="size-4"
                aria-hidden={true}
              />
            }
            onClick={() => onArchive(c, false)}
          />
        )
      },
      meta: {
        globalSearchable: false,
        searchValue: (r) => (r.archived ? t('common.yes') : t('common.no')),
        filterable: true,
        filterLabel: t('common.archived'),
        filterPillValue: (value) => {
          const arr = value as string[]
          if (!Array.isArray(arr) || arr.length === 0) return ''
          const parts: string[] = []
          if (arr.includes(categoryArchivedFilterYes))
            parts.push(t('common.yes'))
          if (arr.includes(categoryArchivedFilterNo)) parts.push(t('common.no'))
          return parts.join(', ')
        }
      },
      filterFn: archivedColumnFilterFn as ColumnDef<
        CategoryTableRow,
        unknown
      >['filterFn']
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => {
        const c = row.original
        const secondaryItems: TableRowMenuItem[] = []

        if (categoryArchiveSupported) {
          if (c.archived) {
            secondaryItems.push({
              id: 'unarchive',
              label: t('common.unarchive'),
              icon: <ArchiveIcon />,
              onSelect: () => onArchive(c, false)
            })
          } else {
            secondaryItems.push({
              id: 'archive',
              label: t('common.archive'),
              icon: <ArchiveIcon />,
              onSelect: () => onArchive(c, true)
            })
          }
        }

        return (
          <div className="flex flex-row justify-end">
            <TableRowMenu
              aria-label={t('common.actions')}
              items={[
                {
                  id: 'edit',
                  label: t('categories.edit'),
                  icon: <PencilIcon />,
                  onSelect: () => onEdit(c)
                },
                ...secondaryItems
              ]}
            />
          </div>
        )
      },
      meta: {
        globalSearchable: false
      }
    }
  ]
}
