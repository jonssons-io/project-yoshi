import { SearchIcon, XIcon } from 'lucide-react'
import type * as React from 'react'

import {
  INPUT_ICON_STROKE,
  InputShell,
  InputShellIcon,
  inputIconClassName,
  inputInnerClassName
} from '@/components/input-shell/input-shell'
import { cn } from '@/lib/utils'

export type SearchInputProps = Omit<
  React.ComponentProps<'input'>,
  'type' | 'className'
> & {
  className?: string
  inputClassName?: string
  /** When true, shows a trailing control that clears the field (works with controlled `value` + `onChange`). */
  clearable?: boolean
  clearLabel?: string
}

function emitEmptyChange(
  onChange: React.ChangeEventHandler<HTMLInputElement> | undefined
) {
  onChange?.({
    target: {
      value: ''
    } as EventTarget & HTMLInputElement,
    currentTarget: {
      value: ''
    } as EventTarget & HTMLInputElement
  } as React.ChangeEvent<HTMLInputElement>)
}

/**
 * Standalone search control (not wrapped in FormField). Search icon is fixed per design system.
 */
export function SearchInput({
  className,
  inputClassName,
  placeholder = 'Search...',
  clearable = false,
  clearLabel = 'Clear search',
  value,
  onChange,
  ...props
}: SearchInputProps) {
  const showClear =
    clearable &&
    value !== undefined &&
    value !== null &&
    String(value).length > 0

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
        className={cn(
          inputInnerClassName,
          clearable &&
            '[&::-webkit-search-cancel-button]:[-webkit-appearance:none]',
          inputClassName
        )}
        {...props}
        {...(value !== undefined
          ? {
              value
            }
          : {})}
        onChange={onChange}
      />
      {showClear ? (
        <button
          type="button"
          className={cn(
            inputIconClassName,
            'text-gray-500 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-0'
          )}
          aria-label={clearLabel}
          onClick={() => {
            emitEmptyChange(onChange)
          }}
        >
          <XIcon
            strokeWidth={INPUT_ICON_STROKE}
            aria-hidden
          />
        </button>
      ) : null}
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
