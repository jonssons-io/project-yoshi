import { ListFilter } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/button/button'
import { SearchInput } from '@/components/search-input/search-input'

export type PageDataTableProps = {
  search: {
    value: string
    onChange: (value: string) => void
    placeholder?: string
  }
  filter: {
    label: string
    onClick: () => void
  }
  primaryAction: ReactNode
  children: ReactNode
}

/**
 * Standard data-page toolbar: search + filter on the left (0.5rem gap), primary action on the
 * right (`justify-between`), then 0.5rem gap before the table block (`children`).
 */
export function PageDataTable({
  search,
  filter,
  primaryAction,
  children
}: PageDataTableProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 flex-row flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-row flex-wrap items-center gap-2">
          <SearchInput
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder}
            className="min-w-48 max-w-md flex-1"
          />
          <Button
            variant="outlined"
            color="primary"
            label={filter.label}
            icon={<ListFilter size={16} />}
            onClick={filter.onClick}
            type="button"
          />
        </div>
        {primaryAction}
      </div>
      <div className="min-h-0 flex-1 overflow-x-auto">{children}</div>
    </div>
  )
}
