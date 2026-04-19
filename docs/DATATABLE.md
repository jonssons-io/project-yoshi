# Data Table System

This document describes how list pages build tables on top of **[TanStack Table](https://tanstack.com/table/latest)** (`@tanstack/react-table`). The app wraps `useReactTable` in `**useDataTable`** and renders a shared shell `**DataTable**` so each screen mostly defines **row shape**, **columns**, and **filter UI**, without re‑implementing search, sorting, toolbar, or pagination wiring.

## Overview


| Piece                                                                                   | Role                                                                                                                                                                      |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `**useDataTable`** (`src/components/data-table/use-data-table.ts`)                      | Creates the table instance: sorting, global search, column filters, optional client pagination, and helpers for the toolbar (`activeFilters`, `filterableColumns`, etc.). |
| `**DataTable**` (`src/components/data-table/data-table.tsx`)                            | Presentational shell: debounced search + filter button + filter pills + primary action, sortable headers, body, optional empty row, optional pagination footer.           |
| `**DataTableColumnDef` / `DataTableColumnMeta**` (`src/components/data-table/types.ts`) | Typed column definitions with `**meta**` for search, filter labels, and filter pill formatting.                                                                           |
| **Filter drawers** (`src/drawers/drawers/*-filter-drawer.tsx`)                          | Side panels that edit `ColumnFiltersState` and call `onApply` with the next filter array.                                                                                 |
| `**PageDataTable`** (`src/components/page-data-table/page-data-table.tsx`)              | Optional simpler layout (search + filter + action + scroll region) **without** tying you to `useDataTable`; use when you are not using the full `DataTable` stack.        |


Exports live in `@/components/data-table` (`src/components/data-table/index.ts`).

## Implementing a new table

1. **Define a row type** (the `TData` generic), usually a flattened view model for one screen.
2. **Add a column factory** (e.g. `createFooTableColumns`): returns `DataTableColumnDef<YourRow>[]`. Use stable `id` for columns without a string `accessorKey`, and set `**meta`** where search or filters need it (see below).
3. **For column filters**, on each filterable column set `meta.filterable: true`, optional `filterLabel` / `filterPillValue`, and a TanStack `**filterFn`** that interprets the `filter.value` shape your drawer writes.
4. **In the route**, call `useDataTable({ data, columns, initialSorting?, defaultPageSize? })`, then render `**DataTable`** with the returned props. Wire `**onFilterClick**` to `openDrawer('yourFilterDrawer', { columnFilters, onApply: setColumnFilters, … })`.
5. **Register the drawer** in `src/drawers/registry.ts` (`DrawerPropsMap`, `drawerMeta`, `drawerComponents`) so `openDrawer` is typed and the shell can render it.

Reference implementations:

- `**src/routes/_authenticated/categories/index.tsx`** + `**categories-table.tsx**` — multiselect-style filters, custom `filterFn`, `searchValue` for composed cells.
- `**src/routes/_authenticated/transactions/index.tsx**` + `**transactions-table.tsx**` — richer filters and patterns.
- `**src/routes/_authenticated/bills/index.tsx**` — multiple `useDataTable` instances on one page.

## `useDataTable` options and return value

**Options** (`UseDataTableOptions<TData>`):


| Option            | Purpose                                                                                                                                      |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `data`            | Row array (client-side table; filtering and sorting run on this array).                                                                      |
| `columns`         | `DataTableColumnDef<TData>[]`.                                                                                                               |
| `initialSorting`  | Optional `SortingState` for default sorted columns.                                                                                          |
| `defaultPageSize` | When **set**, pagination is **enabled** with that page size. When **omitted**, all filtered rows are shown and pagination state is not used. |


**Return value** highlights:


| Field                                | Purpose                                                                                                                                                           |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `table`                              | TanStack `Table<TData>` — pass to `DataTable` and to `DataTablePagination`.                                                                                       |
| `pagination`                         | Present only when `defaultPageSize` was set; pass to `DataTable` as `pagination` when `showPagination` is true so the footer stays aligned with controlled state. |
| `globalFilter` / `setGlobalFilter`   | Current global search string; toolbar updates this (debounced inside `DataTableToolbar`).                                                                         |
| `columnFilters` / `setColumnFilters` | TanStack `ColumnFiltersState`; pass into filter drawers and merge/replace from drawer `onApply`.                                                                  |
| `activeFilters`                      | Derived list for pills: label, display value, `onRemove` per column filter.                                                                                       |
| `clearAllFilters` / `removeFilter`   | Clear column filters or one column.                                                                                                                               |
| `filterableColumns`                  | Columns with `meta.filterable === true` (for drawers that need the list of filterable column defs).                                                               |


Implementation notes:

- `**filterFromLeafRows: true`** is set on the table so nested/grouped row models still filter correctly if you add grouping later.
- **Page index resets** to `0` when `globalFilter`, `columnFilters`, or `data.length` changes (when pagination is enabled).
- Column defs are augmented so that if `**meta.searchValue`** exists and the column has no custom `**sortingFn**`, sorting uses that extracted value with a **locale-aware, numeric** string compare.

## `DataTable` props

The component expects the table instance **plus** the same `columns` array (used for typing and consistency with callers). Important props:


| Prop                                   | Purpose                                                                                            |
| -------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `table`, `columns`                     | From `useDataTable` / your column factory.                                                         |
| `globalFilter`, `onGlobalFilterChange` | Bound to toolbar search (debounced updates go to `setGlobalFilter`).                               |
| `onFilterClick`, `filterDisabled`      | Opens your filter drawer; disable when there is nothing to filter.                                 |
| `activeFilters`                        | From hook; drives removable pills.                                                                 |
| `actionButton`                         | Primary toolbar action (label, `onClick`, optional icon/disabled).                                 |
| `toolbarLabels`                        | `searchPlaceholder`, `filter`, `pillRemoveAriaLabel` (i18n keys typically passed from `t(...)`).   |
| `showPagination`, `pagination`         | When using hook pagination: `showPagination` true and pass `pagination` from the hook return.      |
| `emptyMessage`                         | Optional single row when there are **no rows** after filtering (distinct from “no data from API”). |
| `getRowClassName`                      | Optional per-row class from `row.original`.                                                        |


Sortable headers call TanStack’s `getToggleSortingHandler()`; columns that should not sort use TanStack’s `enableSorting: false` on the column def.

## Column definitions: `DataTableColumnMeta`

`DataTableColumnDef<TData>` is `ColumnDef<TData, any>` with optional `**meta`**:


| `meta` field                   | Purpose                                                                                                                                                                                                  |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `globalSearchable`             | Include column in **global search** when true. Default: `**true`** if there is a string `accessorKey` and **no** custom `cell`; `**false`** if a custom `cell` is set (override explicitly when needed). |
| `searchValue(row)`             | Plain value used for **global search** and, unless you set `sortingFn`, for **sorting**. Use when the cell renders badges, menus, or other non-text UI.                                                  |
| `filterable`                   | `**true`** to expose the column in `filterableColumns` and typically show it in the filter drawer.                                                                                                       |
| `filterLabel`                  | Pill and drawer label; falls back to string `header` or column id.                                                                                                                                       |
| `filterPillValue(filterValue)` | Formats `filter.value` for the toolbar pill; default handles arrays and simple primitives.                                                                                                               |


**Global filter** implementation walks **all** column defs, skips columns that are not globally searchable, and matches the query as a case-insensitive substring against either `meta.searchValue(row)` or `row.getValue(columnId)`.

## Column filters and drawers

TanStack stores filters as `{ id: string, value: unknown }[]`. The app does not prescribe a single `value` shape: each column’s `**filterFn`** must match what the drawer writes (arrays for multiselects, objects for date/amount ranges, etc.).

**Drawer helpers** (`src/drawers/filter-drawer-helpers.ts`):

- `readArrayFilter`, `readDateRangeFilter`, `readAmountRangeFilter` — read current `columnFilters` for a column `id`.
- `stripDrawerFilters` — remove this drawer’s column ids before pushing updated entries (keeps filters from other drawers/columns).
- `normalizeDateRange` — ISO strings for stored date range values.

**Shared domain helpers** (`src/lib/column-filter-utils.ts`): e.g. `getAmountBounds` for slider bounds, `readDateRangeFilter` / `readSingleSelectFilter` aligned with table filter values.

**Registering a drawer**: follow the comment block at the top of `src/drawers/registry.ts` (extend `DrawerPropsMap`, add `drawerMeta` i18n keys, register in `drawerComponents`). Filter drawers usually accept `columnFilters`, `onApply: (filters: ColumnFiltersState) => void`, and screen-specific option lists.

## Pagination

When `**defaultPageSize`** is passed to `useDataTable`:

- Enable the footer with `**showPagination**` on `DataTable`.
- Pass `**pagination**` from the hook into `DataTable` so `DataTablePagination` uses the same controlled `pageIndex` / `pageSize` as `useReactTable` (avoids UI drift under concurrent updates).

`DataTablePagination` hides itself when there is only one page. Copy uses `react-i18next` keys under `common.paginationPage`, `common.previousPage`, `common.nextPage`.

## `PageDataTable` (alternative layout)

`PageDataTable` is a thin layout: search input, filter button, primary action slot, and a scrolling region for **children**. It does **not** create a TanStack table instance. Use it for pages that need the same **visual** toolbar pattern but manage table state differently, or embed a custom table inside the scroll area.

## Related documentation

- [TanStack Table documentation](https://tanstack.com/table/latest) — column APIs, `filterFn`, sorting, and pagination behavior at the library level.
- [Forms](./FORMS.md) — separate system for inputs and validation.

## Source map


| Path                                                  | Contents                                                     |
| ----------------------------------------------------- | ------------------------------------------------------------ |
| `src/components/data-table/types.ts`                  | `DataTableColumnMeta`, `DataTableColumnDef`, `ActiveFilter`. |
| `src/components/data-table/use-data-table.ts`         | `useDataTable`.                                              |
| `src/components/data-table/data-table.tsx`            | `DataTable` shell.                                           |
| `src/components/data-table/data-table-toolbar.tsx`    | Debounced search, filter control, pills, action.             |
| `src/components/data-table/data-table-pagination.tsx` | Prev/next + page label.                                      |
| `src/components/page-data-table/page-data-table.tsx`  | Optional standalone toolbar layout.                          |
| `src/drawers/filter-drawer-helpers.ts`                | Filter state read/write helpers.                             |
| `src/lib/column-filter-utils.ts`                      | Optional filter value helpers for specific column types.     |
