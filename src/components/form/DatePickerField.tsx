/**
 * DatePickerField — single-date picker bound to TanStack Form field context.
 */

import { DatePicker } from '@/components/date-picker/date-picker'
import { FormField } from '@/components/form-field/form-field'
import { useFieldContext } from '@/hooks/form'

export interface DatePickerFieldProps {
  label: string
  labelHelpText?: string
  description?: string
  placeholder?: string
  disabled?: boolean
  /** Icon position relative to the label text. */
  calendarPosition?: 'start' | 'end'
}

export function DatePickerField({
  label,
  labelHelpText,
  description,
  placeholder,
  disabled,
  calendarPosition
}: DatePickerFieldProps) {
  const field = useFieldContext<Date>()

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
      <DatePicker
        id={field.name}
        value={field.state.value}
        onChange={field.handleChange}
        placeholder={placeholder}
        disabled={disabled}
        calendarPosition={calendarPosition}
        aria-invalid={hasError || undefined}
      />
    </FormField>
  )
}
