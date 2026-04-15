import {
  flexRender,
  type PaginationState,
  type Table
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import type { ReactNode } from 'react'

import {
  TableBody,
  TableCell,
  Table as TableFrame,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/table/table'
import { cn } from '@/lib/utils'

import { DataTablePagination } from './data-table-pagination'
import {
  DataTableToolbar,
  type DataTableToolbarLabels
} from './data-table-toolbar'
import type { ActiveFilter, DataTableColumnDef } from './types'

const headButtonClass =
  'inline-flex max-w-full min-w-0 items-center gap-1 rounded-sm px-0 py-0 type-label text-gray-600 outline-none hover:text-gray-800 focus-visible:ring-2 focus-visible:ring-purple-500/40'

export interface DataTableProps<TData> {
  table: Table<TData>
  columns: DataTableColumnDef<TData>[]
  globalFilter: string
  onGlobalFilterChange: (value: string) => void
  onFilterClick: () => void
  filterDisabled?: boolean
  activeFilters: ActiveFilter[]
  actionButton: {
    label: string
    onClick: () => void
    disabled?: boolean
    icon?: ReactNode
  }
  toolbarLabels: DataTableToolbarLabels
  /** When true, pagination controls render below the table (table must use pagination in the hook). */
  showPagination?: boolean
  /** When using `useDataTable` with `defaultPageSize`, pass `pagination` so the footer stays in sync with rows. */
  pagination?: PaginationState
  /** When set, renders a single body row spanning visible columns */
  emptyMessage?: ReactNode
  getRowClassName?: (row: TData) => string | undefined
}

/**
 * App data table shell: toolbar, sortable header row, body, optional pagination.
 */
export function DataTable<TData>({
  table,
  columns: _columns,
  globalFilter,
  onGlobalFilterChange,
  onFilterClick,
  filterDisabled,
  activeFilters,
  actionButton,
  toolbarLabels,
  showPagination = false,
  pagination,
  emptyMessage,
  getRowClassName
}: DataTableProps<TData>) {
  'use no memo'
  const visibleColumnCount = table.getVisibleLeafColumns().length

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <DataTableToolbar
        globalFilter={globalFilter}
        onGlobalFilterChange={onGlobalFilterChange}
        onFilterClick={onFilterClick}
        filterDisabled={filterDisabled}
        activeFilters={activeFilters}
        actionButton={actionButton}
        labels={toolbarLabels}
      />
      <div className="min-h-0 flex-1 overflow-auto">
        <TableFrame>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-gray-300 hover:bg-transparent"
              >
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sorted = header.column.getIsSorted()
                  return (
                    <TableHead
                      key={header.id}
                      className="h-auto px-3 py-2 align-bottom font-normal"
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          className={headButtonClass}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <span className="min-w-0 truncate">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </span>
                          {sorted === 'asc' ? (
                            <ArrowUp
                              className="size-3.5 shrink-0 stroke-[1.5] text-gray-600"
                              aria-hidden={true}
                            />
                          ) : sorted === 'desc' ? (
                            <ArrowDown
                              className="size-3.5 shrink-0 stroke-[1.5] text-gray-600"
                              aria-hidden={true}
                            />
                          ) : (
                            <ArrowUpDown
                              className="size-3.5 shrink-0 stroke-[1.5] text-gray-400"
                              aria-hidden={true}
                            />
                          )}
                        </button>
                      ) : (
                        <span className="type-label text-gray-600">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </span>
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 && emptyMessage ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={visibleColumnCount}
                  className="px-3 py-6 text-center type-body-medium text-gray-700"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : null}
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={cn(
                  'border-gray-300 hover:bg-transparent',
                  getRowClassName?.(row.original)
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className="type-body-medium px-3 py-2 text-black"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </TableFrame>
      </div>
      {showPagination ? (
        <DataTablePagination
          pagination={pagination}
          table={table}
        />
      ) : null}
    </div>
  )
}
