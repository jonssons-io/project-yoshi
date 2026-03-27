/**
 * SelectField component for TanStack Form
 */

import { useTranslation } from 'react-i18next'
import { FormField } from '@/components/form-field/form-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useFieldContext } from '@/hooks/form'

export interface SelectFieldProps {
  label: string
  labelHelpText?: string
  description?: string
  placeholder?: string
  disabled?: boolean
  options: Array<{
    value: string
    label: string
    disabled?: boolean
  }>
  onValueChange?: (value: string) => void
}

export function SelectField({
  label,
  labelHelpText,
  description,
  placeholder,
  disabled,
  options,
  onValueChange
}: SelectFieldProps) {
  const { t } = useTranslation()
  const field = useFieldContext<string>()

  const effectivePlaceholder = placeholder ?? t('common.selectAnOption')

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
      isValidating={Boolean(field.state.meta.isValidating && !hasError)}
    >
      <Select
        value={field.state.value ?? ''}
        onValueChange={(value) => {
          field.handleChange(value)
          onValueChange?.(value)
        }}
        disabled={disabled}
      >
        <SelectTrigger
          id={field.name}
          aria-invalid={hasError || undefined}
        >
          <SelectValue placeholder={effectivePlaceholder} />
        </SelectTrigger>
        <SelectContent position="popper">
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  )
}
