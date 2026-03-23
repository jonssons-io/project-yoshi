import type * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'field-sizing-content flex min-h-16 w-full rounded-sm border border-gray-300 bg-white px-4 py-1 type-label text-black shadow-none outline-none transition-[color,box-shadow] placeholder:text-gray-500 focus-visible:ring-0 aria-invalid:border-red-700 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
