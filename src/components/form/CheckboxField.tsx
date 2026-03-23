/**
 * CheckboxField — single checkbox with optional top field label.
 * Omit `fieldLabel` only for one standalone checkbox; for several options use `CheckboxGroupField`.
 */

import { FormField } from '@/components/form-field/form-field'
import { Checkbox } from '@/components/ui/checkbox'
import { useFieldContext } from '@/hooks/form'
import { cn } from '@/lib/utils'

export interface CheckboxFieldProps {
  /**
   * Label shown beside the checkbox (body-medium, black).
   */
  label: string
  /**
   * Optional label above the checkbox. Omit when this is the only checkbox in context;
   * use `CheckboxGroupField` when presenting multiple checkboxes (it always shows a field label).
   */
  fieldLabel?: string
  labelHelpText?: string
  description?: string
  disabled?: boolean
}

export function CheckboxField({
  label,
  fieldLabel,
  labelHelpText,
  description,
  disabled
}: CheckboxFieldProps) {
  const field = useFieldContext<boolean>()

  const hasError =
    field.state.meta.isTouched && field.state.meta.errors.length > 0
  const errorText = hasError ? field.state.meta.errors.join(', ') : null

  const control = (
    <div className="flex items-center gap-2">
      <Checkbox
        id={field.name}
        checked={field.state.value}
        onCheckedChange={(c) => field.handleChange(c === true)}
        onBlur={() => field.handleBlur()}
        disabled={disabled}
        aria-invalid={hasError || undefined}
      />
      <label
        htmlFor={field.name}
        className={cn(
          'type-label cursor-pointer text-black',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        {label}
      </label>
    </div>
  )

  if (fieldLabel) {
    return (
      <FormField
        label={fieldLabel}
        labelHelpText={labelHelpText}
        description={description}
        fieldId={field.name}
        labelFor={field.name}
        error={errorText}
        isValidating={Boolean(field.state.meta.isValidating && !hasError)}
      >
        {control}
      </FormField>
    )
  }

  return (
    <div className="flex w-full flex-col gap-1">
      {control}
      {hasError ? (
        <p
          className="type-label-small text-red-700"
          role="alert"
        >
          {errorText}
        </p>
      ) : description ? (
        <p className="type-label-small text-gray-800">{description}</p>
      ) : null}
    </div>
  )
}
