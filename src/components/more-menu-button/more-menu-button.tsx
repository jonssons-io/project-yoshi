import { EllipsisVerticalIcon } from 'lucide-react'
import * as React from 'react'

import { BaseButton } from '@/components/base-button/base-button'

/**
 * Props callers pass explicitly. Radix `DropdownMenuTrigger` `asChild` merges
 * additional attributes onto this component at runtime; those are included in `rest`.
 */
export type MoreMenuButtonProps = {
  'aria-label': string
} & Omit<
  React.ComponentPropsWithoutRef<typeof BaseButton>,
  'children' | 'variant' | 'color' | 'iconOnly' | 'aria-label'
>

/**
 * Fixed-style ellipsis control for row / “more” menus. Use only as the child of
 * `DropdownMenuTrigger` with `asChild` so Radix can attach trigger behavior.
 */
export const MoreMenuButton = React.forwardRef<
  HTMLButtonElement,
  MoreMenuButtonProps
>(({ 'aria-label': ariaLabel, type = 'button', ...rest }, ref) => {
  return (
    <BaseButton
      ref={ref}
      {...rest}
      type={type}
      variant="text"
      color="subtle"
      iconOnly
      aria-label={ariaLabel}
    >
      <EllipsisVerticalIcon
        className="stroke-[1.5]"
        aria-hidden={true}
      />
    </BaseButton>
  )
})

MoreMenuButton.displayName = 'MoreMenuButton'
