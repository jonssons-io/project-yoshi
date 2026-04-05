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
  /**
   * Non-interactive “coming soon” row: muted, no navigation, optional tooltip via `disabledReason`.
   */
  comingSoon?: boolean
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
          const comingSoon = Boolean(item.comingSoon)
          const menuItem = (
            <DropdownMenuItem
              onSelect={(e) => {
                if (comingSoon) {
                  e.preventDefault()
                  return
                }
                item.onSelect()
              }}
              disabled={item.disabled || comingSoon}
              className={cn(
                'flex flex-row items-center gap-2',
                comingSoon
                  ? 'cursor-not-allowed text-muted-foreground focus:text-muted-foreground [&_svg]:text-muted-foreground'
                  : 'cursor-pointer',
                item.destructive && !comingSoon
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
              {item.disabledReason && (item.disabled || comingSoon) ? (
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
