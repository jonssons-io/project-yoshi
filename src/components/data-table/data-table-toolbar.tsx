import { ListFilter } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'

import { Button } from '@/components/button/button'
import { Pill } from '@/components/pill/pill'
import { SearchInput } from '@/components/search-input/search-input'
import { cn } from '@/lib/utils'

import type { ActiveFilter } from './types'

const SEARCH_DEBOUNCE_MS = 250
const FILTER_PILL_SEPARATOR = ': '

export interface DataTableToolbarLabels {
  searchPlaceholder: string
  filter: string
  pillRemoveAriaLabel: string
}

export interface DataTableToolbarProps {
  globalFilter: string
  onGlobalFilterChange: (value: string) => void
  onFilterClick: () => void
  /** When true, the filter control is non-interactive (e.g. no rows to filter). */
  filterDisabled?: boolean
  activeFilters: ActiveFilter[]
  actionButton: {
    label: string
    onClick: () => void
    disabled?: boolean
    icon?: ReactNode
  }
  labels: DataTableToolbarLabels
  searchInputClassName?: string
}

/**
 * Shared toolbar: debounced search, filter control, active filter pills, primary action.
 */
export function DataTableToolbar({
  globalFilter,
  onGlobalFilterChange,
  onFilterClick,
  filterDisabled = false,
  activeFilters,
  actionButton,
  labels,
  searchInputClassName
}: DataTableToolbarProps) {
  const [draft, setDraft] = useState(globalFilter)

  useEffect(() => {
    setDraft(globalFilter)
  }, [
    globalFilter
  ])

  useEffect(() => {
    const id = window.setTimeout(() => {
      onGlobalFilterChange(draft)
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [
    draft,
    onGlobalFilterChange
  ])

  return (
    <div className="flex min-w-0 shrink-0 flex-row flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 flex-row flex-wrap items-center gap-2">
        <SearchInput
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={labels.searchPlaceholder}
          className={cn('w-64 max-w-full shrink-0', searchInputClassName)}
          aria-label={labels.searchPlaceholder}
        />
        <Button
          type="button"
          variant="outlined"
          color="primary"
          label={labels.filter}
          icon={<ListFilter size={16} />}
          onClick={onFilterClick}
          disabled={filterDisabled}
        />
        <div className="flex min-h-9 min-w-0 flex-1 flex-row flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain py-0.5">
          {activeFilters.map((filter) => {
            const pillText =
              filter.label + FILTER_PILL_SEPARATOR + filter.displayValue
            return (
              <Pill
                key={filter.columnId}
                onRemove={filter.onRemove}
                removeLabel={labels.pillRemoveAriaLabel}
              >
                {pillText}
              </Pill>
            )
          })}
        </div>
      </div>
      <div className="shrink-0">
        <Button
          type="button"
          color="primary"
          variant="filled"
          label={actionButton.label}
          icon={actionButton.icon}
          onClick={actionButton.onClick}
          disabled={actionButton.disabled}
        />
      </div>
    </div>
  )
}
