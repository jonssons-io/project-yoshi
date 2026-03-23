import type * as React from 'react'

import { cn } from '@/lib/utils'

/** 1px gray-300 border, rounded-sm, 16px horizontal / 4px vertical padding, 8px gap between adornments and value. */
export const inputShellClassName =
  'flex w-full min-w-0 items-center gap-2 rounded-sm border border-gray-300 bg-white px-4 py-1'

/** Text inside inputs: type-label, black; placeholder gray-500. */
export const inputInnerClassName =
  'min-w-0 flex-1 border-0 bg-transparent p-0 type-label text-black outline-none placeholder:text-gray-500 focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50'

export const inputIconClassName =
  'inline-flex size-4 shrink-0 items-center justify-center text-gray-500 [&_svg]:size-4 [&_svg]:shrink-0'

export const INPUT_ICON_STROKE = 1.5 as const

type InputShellProps = React.ComponentProps<'div'>

export function InputShell({ className, ...props }: InputShellProps) {
  return (
    <div
      data-slot="input-shell"
      className={cn(inputShellClassName, className)}
      {...props}
    />
  )
}

type InputShellIconProps = {
  children: React.ReactNode
  className?: string
}

export function InputShellIcon({ children, className }: InputShellIconProps) {
  return (
    <span
      data-slot="input-shell-icon"
      className={cn(inputIconClassName, className)}
    >
      {children}
    </span>
  )
}
