import { InputShell, inputInnerClassName } from '@/components/input-shell/input-shell'

export interface NumericInputProps {
  id?: string
  value?: number
  onValueChange: (value: number | undefined) => void
  min?: number
  max?: number
  disabled?: boolean
  placeholder?: string
  unit?: string
}

/**
 * Lightweight controlled numeric input for non-form UI like filters.
 * Keeps the shared input shell styling without coupling callers to the low-level primitive.
 */
export function NumericInput({
  id,
  value,
  onValueChange,
  min,
  max,
  disabled,
  placeholder,
  unit
}: NumericInputProps) {
  return (
    <InputShell>
      {unit ? (
        <span className="type-label shrink-0 text-gray-500">{unit}</span>
      ) : null}
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step="any"
        min={min}
        max={max}
        disabled={disabled}
        placeholder={placeholder}
        value={value ?? ''}
        onChange={(event) => {
          const nextValue = event.target.value
          onValueChange(nextValue === '' ? undefined : Number(nextValue))
        }}
        className={inputInnerClassName}
      />
    </InputShell>
  )
}
