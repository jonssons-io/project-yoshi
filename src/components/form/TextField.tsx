/**
 * TextField component for TanStack Form
 */

import type { LucideIcon } from 'lucide-react'
import type * as React from 'react'
import { FormField } from '@/components/form-field/form-field'
import {
  INPUT_ICON_STROKE,
  InputShell,
  InputShellIcon,
  inputInnerClassName
} from '@/components/input-shell/input-shell'
import { useFieldContext } from '@/hooks/form'
import { cn } from '@/lib/utils'

export interface TextFieldProps {
  label: string
  labelHelpText?: string
  description?: string
  placeholder?: string
  type?: React.HTMLInputTypeAttribute
  disabled?: boolean
  prependIcon?: LucideIcon
  inputProps?: Omit<
    React.ComponentProps<'input'>,
    | 'value'
    | 'onChange'
    | 'onBlur'
    | 'id'
    | 'name'
    | 'type'
    | 'disabled'
    | 'aria-invalid'
    | 'className'
  >
}

export function TextField({
  label,
  labelHelpText,
  description,
  placeholder,
  type = 'text',
  disabled,
  prependIcon: PrependIcon,
  inputProps
}: TextFieldProps) {
  const field = useFieldContext<string>()

  const hasError =
    field.state.meta.isTouched && field.state.meta.errors.length > 0
  const errorText = hasError ? field.state.meta.errors.join(', ') : null

  return (
    <FormField
      label={label}
      labelHelpText={labelHelpText}
      description={description}
      fieldId={field.name}
      error={errorText}
      isValidating={field.state.meta.isValidating && !hasError}
    >
      <InputShell data-invalid={hasError || undefined}>
        {PrependIcon ? (
          <InputShellIcon>
            <PrependIcon
              strokeWidth={INPUT_ICON_STROKE}
              aria-hidden
            />
          </InputShellIcon>
        ) : null}
        <input
          id={field.name}
          name={field.name}
          type={type}
          placeholder={placeholder}
          value={field.state.value ?? ''}
          onChange={(e) => field.handleChange(e.target.value)}
          onBlur={field.handleBlur}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          className={cn(inputInnerClassName)}
          {...inputProps}
        />
      </InputShell>
    </FormField>
  )
}
