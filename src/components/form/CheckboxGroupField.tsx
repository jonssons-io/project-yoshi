/**
 * CheckboxGroupField — multiple checkboxes under one required field label.
 * Use `CheckboxField` without `fieldLabel` only for a single standalone checkbox.
 */

import { FormField } from '@/components/form-field/form-field'
import { Checkbox } from '@/components/ui/checkbox'
import { useFieldContext } from '@/hooks/form'
import { cn } from '@/lib/utils'

export interface CheckboxGroupOption {
  value: string
  label: string
}

export interface CheckboxGroupFieldProps {
  /**
   * Field label for the group (always shown).
   */
  label: string
  labelHelpText?: string
  description?: string
  disabled?: boolean
  options: CheckboxGroupOption[]
  direction?: 'vertical' | 'horizontal'
}

export function CheckboxGroupField({
  label,
  labelHelpText,
  description,
  disabled,
  options,
  direction = 'vertical'
}: CheckboxGroupFieldProps) {
  const field = useFieldContext<string[]>()

  const hasError =
    field.state.meta.isTouched && field.state.meta.errors.length > 0
  const errorText = hasError ? field.state.meta.errors.join(', ') : null

  const selected = new Set(field.state.value ?? [])

  const toggle = (value: string, checked: boolean) => {
    const next = new Set(selected)
    if (checked) {
      next.add(value)
    } else {
      next.delete(value)
    }
    field.handleChange([
      ...next
    ])
  }

  const groupLabelId = `${field.name}-group-label`

  return (
    <FormField
      label={label}
      labelHelpText={labelHelpText}
      description={description}
      fieldId={field.name}
      groupLabelId={groupLabelId}
      error={errorText}
      isValidating={Boolean(field.state.meta.isValidating && !hasError)}
    >
      <fieldset
        aria-labelledby={groupLabelId}
        className="min-w-0 border-0 p-0"
      >
        <div
          className={cn(
            'flex',
            direction === 'vertical'
              ? 'flex-col gap-2'
              : 'flex-row flex-wrap gap-4'
          )}
        >
          {options.map((option) => {
            const id = `${field.name}-${option.value}`
            const isOn = selected.has(option.value)
            return (
              <div
                key={option.value}
                className="flex items-center gap-2"
              >
                <Checkbox
                  id={id}
                  checked={isOn}
                  onCheckedChange={(c) => toggle(option.value, c === true)}
                  onBlur={() => field.handleBlur()}
                  disabled={disabled}
                  aria-invalid={hasError || undefined}
                />
                <label
                  htmlFor={id}
                  className={cn(
                    'type-label cursor-pointer text-black',
                    disabled && 'cursor-not-allowed opacity-50'
                  )}
                >
                  {option.label}
                </label>
              </div>
            )
          })}
        </div>
      </fieldset>
    </FormField>
  )
}
