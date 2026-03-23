/**
 * RadioGroupField component for TanStack Form
 */

import { FormField } from '@/components/form-field/form-field'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useFieldContext } from '@/hooks/form'
import { cn } from '@/lib/utils'

export interface RadioGroupOption {
  value: string
  label: string
  description?: string
}

export interface RadioGroupFieldProps {
  label: string
  labelHelpText?: string
  description?: string
  disabled?: boolean
  options: RadioGroupOption[]
  direction?: 'horizontal' | 'vertical'
  onValueChange?: (value: string) => void
}

export function RadioGroupField({
  label,
  labelHelpText,
  description,
  disabled,
  options,
  direction = 'horizontal',
  onValueChange
}: RadioGroupFieldProps) {
  const field = useFieldContext<string>()

  const hasError =
    field.state.meta.isTouched && field.state.meta.errors.length > 0
  const errorText = hasError ? field.state.meta.errors.join(', ') : null

  const handleChange = (value: string) => {
    field.handleChange(value)
    onValueChange?.(value)
  }

  return (
    <FormField
      label={label}
      labelHelpText={labelHelpText}
      description={description}
      fieldId={field.name}
      error={errorText}
      isValidating={Boolean(field.state.meta.isValidating && !hasError)}
    >
      <RadioGroup
        id={field.name}
        value={field.state.value}
        onValueChange={handleChange}
        disabled={disabled}
        className={cn(
          'flex gap-4',
          direction === 'vertical' && 'flex-col gap-2'
        )}
      >
        {options.map((option) => (
          <div
            key={option.value}
            className="flex items-center gap-2"
          >
            <RadioGroupItem
              value={option.value}
              id={`${field.name}-${option.value}`}
            />
            <Label
              htmlFor={`${field.name}-${option.value}`}
              className="type-label cursor-pointer font-normal text-black"
            >
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </FormField>
  )
}
