import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { CheckIcon } from 'lucide-react'
import type * as React from 'react'

import { cn } from '@/lib/utils'

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer flex size-4 shrink-0 items-center justify-center rounded-[3px] border border-gray-300 bg-white outline-none transition-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-0 data-[state=checked]:bg-green-500 data-[state=checked]:text-white',
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex size-4 items-center justify-center text-current transition-none"
      >
        <CheckIcon
          className="size-4"
          strokeWidth={2}
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
