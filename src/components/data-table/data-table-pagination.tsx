import type { Table } from '@tanstack/react-table'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { IconButton } from '@/components/icon-button/icon-button'

export interface DataTablePaginationProps<TData> {
  table: Table<TData>
}

/**
 * Previous / next controls and current page indicator for paginated tables.
 */
export function DataTablePagination<TData>({
  table
}: DataTablePaginationProps<TData>) {
  const { t } = useTranslation()
  const pageCount = table.getPageCount()
  const pageIndex = table.getState().pagination.pageIndex
  const current = pageIndex + 1

  if (pageCount <= 1) return null

  return (
    <div className="flex shrink-0 flex-row flex-wrap items-center justify-end gap-3 pt-3">
      <p className="type-label text-gray-600">
        {t('common.paginationPage', {
          current,
          total: pageCount
        })}
      </p>
      <div className="flex flex-row items-center gap-1">
        <IconButton
          type="button"
          variant="outlined"
          color="primary"
          icon={
            <ChevronLeft
              className="size-4 stroke-[1.5]"
              aria-hidden={true}
            />
          }
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          aria-label={t('common.previousPage')}
        />
        <IconButton
          type="button"
          variant="outlined"
          color="primary"
          icon={
            <ChevronRight
              className="size-4 stroke-[1.5]"
              aria-hidden={true}
            />
          }
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          aria-label={t('common.nextPage')}
        />
      </div>
    </div>
  )
}
