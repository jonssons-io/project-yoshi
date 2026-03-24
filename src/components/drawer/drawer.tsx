import { XIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { IconButton } from '@/components/icon-button/icon-button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle
} from '@/components/ui/drawer'

export interface DrawerShellProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  children: ReactNode
}

/**
 * Application drawer chrome: Vaul wiring, overlay, side panel layout, header, and close control.
 * No domain logic — concrete bodies render as `children`.
 */
export function DrawerShell({
  open,
  onOpenChange,
  title,
  description,
  children
}: DrawerShellProps) {
  return (
    <Drawer
      direction="right"
      open={open}
      onOpenChange={onOpenChange}
    >
      <DrawerContent className="flex h-full max-h-screen min-h-0 w-full max-w-md flex-col p-0 sm:max-w-lg">
        <div className="flex shrink-0 flex-row items-start justify-between gap-4 border-b px-4 py-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {title ? (
              <DrawerTitle className="text-left">{title}</DrawerTitle>
            ) : null}
            {description ? (
              <DrawerDescription className="text-left">
                {description}
              </DrawerDescription>
            ) : null}
          </div>
          <IconButton
            type="button"
            variant="text"
            color="subtle"
            aria-label="Close"
            icon={<XIcon />}
            onClick={() => {
              onOpenChange(false)
            }}
          />
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
