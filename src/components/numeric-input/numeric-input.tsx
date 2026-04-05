import {
  InputShell,
  inputInnerClassName,
  numberInputNoSpinnersClassName
} from '@/components/input-shell/input-shell'
import { cn } from '@/lib/utils'

export interface NumericInputProps {
  id?: string
  value?: number
  onValueChange: (value: number | undefined) => void
  min?: number
  max?: number
  /**
   * Passed to the native `step` attribute (default `0.01`).
   */
  step?: string | number
  disabled?: boolean
  placeholder?: string
  unit?: string
}

/**
 * Filter / shell numeric field: native `type="number"`; no rounding or clamping in JS.
 */
export function NumericInput({
  id,
  value,
  onValueChange,
  min,
  max,
  step = 0.01,
  disabled,
  placeholder,
  unit
}: NumericInputProps) {
  const stepAttr = typeof step === 'number' ? String(step) : step

  return (
    <InputShell>
      {unit ? (
        <span className="type-label shrink-0 text-gray-500">{unit}</span>
      ) : null}
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step={stepAttr}
        min={min}
        max={max}
        disabled={disabled}
        placeholder={placeholder}
        value={
          value === undefined || value === null || Number.isNaN(value)
            ? ''
            : value
        }
        onChange={(e) => {
          const v = e.target.value
          if (v === '') {
            onValueChange(undefined)
            return
          }
          onValueChange(e.target.valueAsNumber)
        }}
        className={cn(inputInnerClassName, numberInputNoSpinnersClassName)}
      />
    </InputShell>
  )
}
