import type * as React from 'react'

import { cn } from '@/lib/utils'

/** Border + field surface follow theme (`bg-card` reads correctly on drawers and dark UI). */
export const inputShellClassName =
  'flex w-full min-w-0 items-center gap-2 rounded-sm border border-input bg-card px-4 py-1 transition-colors'

/** Text inside inputs: type-label; placeholder uses muted foreground. */
export const inputInnerClassName =
  'min-w-0 flex-1 border-0 bg-transparent p-0 type-label text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50'

/** Use with `type="number"` when native steppers are hidden (e.g. small `step`). */
export const numberInputNoSpinnersClassName =
  '[&::-webkit-outer-spin-button]:[-webkit-appearance:none] [&::-webkit-inner-spin-button]:[-webkit-appearance:none] [-moz-appearance:textfield]'

export const inputIconClassName =
  'inline-flex size-4 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4 [&_svg]:shrink-0'

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
