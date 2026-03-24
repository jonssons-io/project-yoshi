import { EllipsisVerticalIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { IconButton } from '@/components/icon-button/icon-button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export type TableRowMenuItem = {
  id: string
  label: ReactNode
  icon?: ReactNode
  onSelect: () => void
  destructive?: boolean
}

export type TableRowMenuProps = {
  items: TableRowMenuItem[]
  'aria-label': string
}

/**
 * Last-column actions control: ellipsis trigger and dropdown items (wraps Radix menu).
 */
export function TableRowMenu({
  items,
  'aria-label': ariaLabel
}: TableRowMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          type="button"
          variant="text"
          color="subtle"
          icon={<EllipsisVerticalIcon />}
          onClick={() => void 0}
          aria-label={ariaLabel}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.id}
            onSelect={() => item.onSelect()}
            className={cn(
              'flex cursor-pointer flex-row items-center gap-2',
              item.destructive ? 'text-red-600 focus:text-red-600' : undefined
            )}
          >
            {item.icon ? (
              <span className="inline-flex shrink-0 [&_svg]:size-4">
                {item.icon}
              </span>
            ) : null}
            <span>{item.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
