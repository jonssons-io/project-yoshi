/**
 * NumberField — native `type="number"`; optional `min` / `max` / `step` for validation hints.
 */

import { FormField } from '@/components/form-field/form-field'
import {
  InputShell,
  inputInnerClassName,
  numberInputNoSpinnersClassName
} from '@/components/input-shell/input-shell'
import { useFieldContext } from '@/hooks/form'
import { cn } from '@/lib/utils'

export interface NumberFieldProps {
  label: string
  labelHelpText?: string
  description?: string
  placeholder?: string
  disabled?: boolean
  min?: number
  max?: number
  /**
   * Native `step` (default `0.01`).
   */
  step?: string | number
  /**
   * Prepended unit label (e.g. "SEK"), type-label in gray-500.
   */
  unit?: string
}

export function NumberField({
  label,
  labelHelpText,
  description,
  placeholder,
  disabled,
  min,
  max,
  step = 0.01,
  unit
}: NumberFieldProps) {
  const field = useFieldContext<number | null>()
  const stepAttr = typeof step === 'number' ? String(step) : step

  const hasError =
    field.state.meta.isTouched && field.state.meta.errors.length > 0
  const errorText = hasError ? field.state.meta.errors.join(', ') : null

  const raw = field.state.value
  const valueAttr =
    raw === undefined || raw === null || Number.isNaN(raw) ? '' : raw

  return (
    <FormField
      label={label}
      labelHelpText={labelHelpText}
      description={description}
      fieldId={field.name}
      error={errorText}
      isValidating={Boolean(field.state.meta.isValidating && !hasError)}
    >
      <InputShell data-invalid={hasError || undefined}>
        {unit ? (
          <span className="type-label shrink-0 text-gray-500">{unit}</span>
        ) : null}
        <input
          id={field.name}
          name={field.name}
          type="number"
          inputMode="decimal"
          step={stepAttr}
          min={min}
          max={max}
          placeholder={placeholder}
          value={valueAttr}
          onChange={(e) => {
            const v = e.target.value
            if (v === '') {
              field.handleChange(null)
              return
            }
            const n = e.target.valueAsNumber
            field.handleChange(Number.isFinite(n) ? n : null)
          }}
          onBlur={field.handleBlur}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          className={cn(inputInnerClassName, numberInputNoSpinnersClassName)}
        />
      </InputShell>
    </FormField>
  )
}
