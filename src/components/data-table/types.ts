import type { ColumnDef } from '@tanstack/react-table'

export interface DataTableColumnMeta<TData = unknown> {
  /**
   * Whether this column is included in global search.
   * Defaults to `true` for string accessors, `false` when a custom `cell` is defined.
   * Set explicitly to override.
   */
  globalSearchable?: boolean

  /**
   * A function that extracts a plain string/number value from the row
   * for sorting and searching purposes. Required when the cell renders
   * a component (badge, icon, etc.) rather than a raw string.
   * If not provided, TanStack's default accessor value is used.
   */
  searchValue?: (row: TData) => string | number | boolean

  /**
   * Whether this column appears as an option in the filter drawer.
   */
  filterable?: boolean

  /**
   * Human-readable label for this column, used in filter pills.
   * Falls back to `header` if it's a string.
   */
  filterLabel?: string

  /**
   * Formats the raw filter value into a human-readable string
   * for display in the active filter pill.
   */
  filterPillValue?: (filterValue: unknown) => string
}

// TValue varies per column (string, number, …); aligning with TanStack’s ColumnDef<TData, any> pattern.
// biome-ignore lint/suspicious/noExplicitAny: Column cell/accessor value types differ per column definition.
export type DataTableColumnDef<TData> = ColumnDef<TData, any> & {
  meta?: DataTableColumnMeta<TData>
}

/**
 * Describes an active filter for the toolbar to render as a pill.
 */
export interface ActiveFilter {
  columnId: string
  label: string
  displayValue: string
  onRemove: () => void
}
