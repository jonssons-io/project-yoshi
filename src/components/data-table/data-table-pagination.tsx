import type { PaginationState, Table } from '@tanstack/react-table'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { IconButton } from '@/components/icon-button/icon-button'

export interface DataTablePaginationProps<TData> {
  table: Table<TData>
  /**
   * Controlled pagination from the same source passed to `useReactTable` state.
   * When set, page label and prev/next enabled state use this + filtered row count so the UI
   * cannot drift from the rows (see table-core `getState()` vs row models under concurrent rendering).
   */
  pagination?: PaginationState
}

/**
 * Previous / next controls and current page indicator for paginated tables.
 */
export function DataTablePagination<TData>({
  table,
  pagination: paginationProp
}: DataTablePaginationProps<TData>) {
  const { t } = useTranslation()
  const filteredRowCount = table.getFilteredRowModel().rows.length

  const pageCount = paginationProp
    ? Math.ceil(filteredRowCount / paginationProp.pageSize) || 0
    : table.getPageCount()

  const pageIndex = paginationProp
    ? paginationProp.pageIndex
    : table.getState().pagination.pageIndex

  const safePageIndex =
    pageCount > 0 ? Math.min(pageIndex, Math.max(0, pageCount - 1)) : 0
  const current = safePageIndex + 1

  const canPrevious = safePageIndex > 0
  const canNext = pageCount > 0 && safePageIndex < pageCount - 1

  if (pageCount <= 1) return null

  return (
    <div className="flex shrink-0 flex-row flex-wrap items-center justify-end gap-3 pt-3">
      <p className="type-label text-gray-600">
        {t('common.paginationPage', {
          current,
          total: Math.max(1, pageCount)
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
          disabled={!canPrevious}
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
          disabled={!canNext}
          aria-label={t('common.nextPage')}
        />
      </div>
    </div>
  )
}
