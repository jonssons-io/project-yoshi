import type * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'file:text-foreground selection:bg-primary selection:text-primary-foreground h-auto w-full min-w-0 rounded-sm border border-input bg-card px-4 py-1 type-label text-foreground shadow-none outline-none transition-[color,box-shadow] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:type-label file:font-medium placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        'focus-visible:ring-0',
        'aria-invalid:border-red-700',
        className
      )}
      {...props}
    />
  )
}

export { Input }
