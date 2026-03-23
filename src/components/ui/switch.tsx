import * as SwitchPrimitive from '@radix-ui/react-switch'
import type * as React from 'react'

import { cn } from '@/lib/utils'

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer inline-flex h-4 w-8 shrink-0 items-center rounded-md border border-transparent bg-gray-300 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-green-500',
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block size-3.5 rounded-full bg-white ring-0 transition-transform',
          'data-[state=unchecked]:translate-x-px data-[state=checked]:translate-x-[17px]'
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
