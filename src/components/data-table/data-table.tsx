import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { type ReactNode, useState } from 'react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/table/table'
import { cn } from '@/lib/utils'

const headButtonClass =
  'inline-flex max-w-full min-w-0 items-center gap-1 rounded-sm px-0 py-0 type-label text-gray-600 outline-none hover:text-gray-800 focus-visible:ring-2 focus-visible:ring-purple-500/40'

export type DataTableProps<TData> = {
  data: TData[]
  columns: ColumnDef<TData>[]
  /** When set, renders a single body row spanning all columns */
  emptyMessage?: ReactNode
  getRowClassName?: (row: TData) => string | undefined
}

/**
 * App table shell: muted column headers, optional client-side sorting (use `accessorFn` /
 * `accessorKey` on columns so composite cells still sort).
 */
export function DataTable<TData>({
  data,
  columns,
  emptyMessage,
  getRowClassName
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  })

  const columnCount = table.getAllColumns().length

  return (
    <Table>
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
        {data.length === 0 && emptyMessage ? (
          <TableRow className="hover:bg-transparent">
            <TableCell
              colSpan={columnCount}
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
    </Table>
  )
}
