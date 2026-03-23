import { SearchIcon } from 'lucide-react'
import type * as React from 'react'

import {
  INPUT_ICON_STROKE,
  InputShell,
  InputShellIcon,
  inputInnerClassName
} from '@/components/input-shell/input-shell'
import { cn } from '@/lib/utils'

export type SearchInputProps = Omit<
  React.ComponentProps<'input'>,
  'type' | 'className'
> & {
  className?: string
  inputClassName?: string
}

/**
 * Standalone search control (not wrapped in FormField). Search icon is fixed per design system.
 */
export function SearchInput({
  className,
  inputClassName,
  placeholder = 'Search...',
  ...props
}: SearchInputProps) {
  return (
    <InputShell className={className}>
      <InputShellIcon>
        <SearchIcon
          strokeWidth={INPUT_ICON_STROKE}
          aria-hidden
        />
      </InputShellIcon>
      <input
        type="search"
        autoComplete="off"
        placeholder={placeholder}
        className={cn(inputInnerClassName, inputClassName)}
        {...props}
      />
    </InputShell>
  )
}

/**
 * Search row inside autocomplete / multiselect dropdowns: same look as SearchInput with 8px horizontal padding on the shell.
 */
export function DropdownSearchInput({ className, ...props }: SearchInputProps) {
  return (
    <SearchInput
      {...props}
      className={cn('px-2', className)}
    />
  )
}
