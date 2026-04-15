import {
  type ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type Row,
  type SortingState,
  type Table,
  useReactTable
} from '@tanstack/react-table'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type {
  ActiveFilter,
  DataTableColumnDef,
  DataTableColumnMeta
} from './types'

export interface UseDataTableOptions<TData> {
  data: TData[]
  columns: DataTableColumnDef<TData>[]
  initialSorting?: SortingState
  /** When set, row pagination is enabled with this initial page size. */
  defaultPageSize?: number
}

export interface UseDataTableReturn<TData> {
  table: Table<TData>
  /** Present when `defaultPageSize` was set; use for pagination UI so it matches controlled table state. */
  pagination?: PaginationState
  globalFilter: string
  setGlobalFilter: (value: string) => void
  columnFilters: ColumnFiltersState
  setColumnFilters: (
    filters:
      | ColumnFiltersState
      | ((prev: ColumnFiltersState) => ColumnFiltersState)
  ) => void
  activeFilters: ActiveFilter[]
  clearAllFilters: () => void
  removeFilter: (columnId: string) => void
  filterableColumns: DataTableColumnDef<TData>[]
}

function getColumnDefId<TData>(col: DataTableColumnDef<TData>): string {
  if (col.id) return col.id
  if ('accessorKey' in col && typeof col.accessorKey === 'string') {
    return col.accessorKey
  }
  return ''
}

function defaultGlobalSearchable<TData>(
  col: DataTableColumnDef<TData>
): boolean {
  const meta = col.meta as DataTableColumnMeta<TData> | undefined
  if (meta?.globalSearchable !== undefined) return meta.globalSearchable
  if (col.cell !== undefined) return false
  if ('accessorKey' in col && typeof col.accessorKey === 'string') return true
  return false
}

function compareSortValues(
  a: string | number | boolean,
  b: string | number | boolean
): number {
  if (a === b) return 0
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, {
    numeric: true
  })
}

function headerLabel<TData>(col: DataTableColumnDef<TData>): string {
  const h = col.header
  if (typeof h === 'string') return h
  const meta = col.meta as DataTableColumnMeta<TData> | undefined
  return meta?.filterLabel ?? getColumnDefId(col) ?? ''
}

function formatFilterPillDisplay<TData>(
  value: unknown,
  meta: DataTableColumnMeta<TData> | undefined
): string {
  if (meta?.filterPillValue) {
    return meta.filterPillValue(value)
  }
  if (Array.isArray(value)) {
    return value.map((v) => String(v)).join(', ')
  }
  if (value === null || value === undefined) return ''
  return String(value)
}

/**
 * Creates a TanStack Table instance with shared global search, sorting, filtering, and toolbar helpers.
 */
export function useDataTable<TData>(
  options: UseDataTableOptions<TData>
): UseDataTableReturn<TData> {
  'use no memo'
  const { data, columns, initialSorting, defaultPageSize } = options

  const [sorting, setSorting] = useState<SortingState>(initialSorting ?? [])
  const [globalFilter, setGlobalFilter] = useState('')
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState<PaginationState>(() => ({
    pageIndex: 0,
    pageSize: defaultPageSize ?? 10
  }))

  const enablePagination = defaultPageSize !== undefined

  const columnsWithSort = useMemo(
    () =>
      columns.map((col) => {
        const meta = col.meta as DataTableColumnMeta<TData> | undefined
        const searchValueFn = meta?.searchValue
        if (!searchValueFn || col.sortingFn) return col
        return {
          ...col,
          sortingFn: (rowA: Row<TData>, rowB: Row<TData>) =>
            compareSortValues(
              searchValueFn(rowA.original),
              searchValueFn(rowB.original)
            )
        }
      }),
    [
      columns
    ]
  )

  const globalFilterFn = useMemo(() => {
    return (row: Row<TData>, _columnId: string, filterValue: unknown) => {
      const q = String(filterValue ?? '')
        .trim()
        .toLowerCase()
      if (!q) return true

      for (const colDef of columns) {
        if (!defaultGlobalSearchable(colDef)) continue
        const meta = colDef.meta as DataTableColumnMeta<TData> | undefined
        let haystack: string
        if (meta?.searchValue) {
          haystack = String(meta.searchValue(row.original)).toLowerCase()
        } else {
          const id = getColumnDefId(colDef)
          if (!id) continue
          const raw = row.getValue(id)
          haystack =
            raw === null || raw === undefined ? '' : String(raw).toLowerCase()
        }
        if (haystack.includes(q)) return true
      }
      return false
    }
  }, [
    columns
  ])

  const filterableColumns = useMemo(
    () => columns.filter((c) => c.meta?.filterable === true),
    [
      columns
    ]
  )

  const clearAllFilters = useCallback(() => {
    setColumnFilters([])
  }, [])

  const removeFilter = useCallback((columnId: string) => {
    setColumnFilters((prev) => prev.filter((f) => f.id !== columnId))
  }, [])

  const activeFilters = useMemo((): ActiveFilter[] => {
    return columnFilters.map((filter) => {
      const col = columns.find(
        (c) => getColumnDefId(c) === filter.id || c.id === filter.id
      )
      const meta = col?.meta as DataTableColumnMeta<TData> | undefined
      const label = meta?.filterLabel ?? (col ? headerLabel(col) : filter.id)
      const displayValue = formatFilterPillDisplay<TData>(filter.value, meta)
      return {
        columnId: filter.id,
        label,
        displayValue,
        onRemove: () => removeFilter(filter.id)
      }
    })
  }, [
    columnFilters,
    columns,
    removeFilter
  ])

  // Reset to first page when filters or dataset change (not inferred safely by static dependency analysis).
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional reset on filter/data changes
  useEffect(() => {
    if (!enablePagination) return
    setPagination((p) => ({
      ...p,
      pageIndex: 0
    }))
  }, [
    enablePagination,
    globalFilter,
    columnFilters,
    data.length
  ])

  const table = useReactTable({
    data,
    columns: columnsWithSort,
    autoResetPageIndex: false,
    state: {
      sorting,
      globalFilter,
      columnFilters,
      ...(enablePagination
        ? {
            pagination
          }
        : {})
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    ...(enablePagination
      ? {
          onPaginationChange: setPagination
        }
      : {}),
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(enablePagination
      ? {
          getPaginationRowModel: getPaginationRowModel()
        }
      : {}),
    filterFromLeafRows: true
  })

  return {
    table,
    ...(enablePagination ? { pagination } : {}),
    globalFilter,
    setGlobalFilter,
    columnFilters,
    setColumnFilters,
    activeFilters,
    clearAllFilters,
    removeFilter,
    filterableColumns
  }
}
