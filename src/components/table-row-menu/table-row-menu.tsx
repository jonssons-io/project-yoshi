import { Fragment, type ReactNode } from 'react'

import { MoreMenuButton } from '@/components/more-menu-button/more-menu-button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export type TableRowMenuItem = {
  id: string
  label: ReactNode
  icon?: ReactNode
  onSelect: () => void
  destructive?: boolean
  disabled?: boolean
  /** Tooltip shown when the item is disabled */
  disabledReason?: string
  /** When true, a separator is rendered above this item */
  separatorBefore?: boolean
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
        <MoreMenuButton aria-label={ariaLabel} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((item) => {
          const menuItem = (
            <DropdownMenuItem
              onSelect={() => item.onSelect()}
              disabled={item.disabled}
              className={cn(
                'flex cursor-pointer flex-row items-center gap-2',
                item.destructive
                  ? 'text-red-600 focus:text-red-600 [&_svg]:text-red-600'
                  : undefined
              )}
            >
              {item.icon ? (
                <span className="inline-flex shrink-0 [&_svg]:size-4">
                  {item.icon}
                </span>
              ) : null}
              <span>{item.label}</span>
            </DropdownMenuItem>
          )

          return (
            <Fragment key={item.id}>
              {item.separatorBefore ? <DropdownMenuSeparator /> : null}
              {item.disabled && item.disabledReason ? (
                <div title={item.disabledReason}>{menuItem}</div>
              ) : (
                menuItem
              )}
            </Fragment>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
