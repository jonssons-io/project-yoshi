/**
 * NumberField — numeric input with up to two decimal places; step buttons use integer steps only.
 */

import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { FormField } from '@/components/form-field/form-field'
import {
  INPUT_ICON_STROKE,
  InputShell,
  inputInnerClassName
} from '@/components/input-shell/input-shell'
import { ShadcnButton } from '@/components/ui/button'
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
   * Step for the up/down controls. Coerced to a positive integer; default `1`.
   * The numeric value may still have up to two decimal places.
   */
  step?: string | number
  /**
   * Prepended unit label (e.g. "SEK"), type-label in gray-500.
   */
  unit?: string
}

function parseStep(step: string | number): number {
  const raw = typeof step === 'number' ? step : Number.parseFloat(step)
  if (!Number.isFinite(raw)) {
    return 1
  }
  const t = Math.trunc(raw)
  return t >= 1 ? t : 1
}

/** Round to at most two decimal places (half-up). */
function roundToTwoDecimals(n: number): number {
  return Math.round(n * 100) / 100
}

function formatDisplayValue(n: number): string {
  const r = roundToTwoDecimals(n)
  if (Object.is(r, -0)) {
    return '0'
  }
  return String(r)
}

export function NumberField({
  label,
  labelHelpText,
  description,
  placeholder,
  disabled,
  min,
  max,
  step = 1,
  unit
}: NumberFieldProps) {
  const { t } = useTranslation()
  const field = useFieldContext<number>()
  const stepNum = parseStep(step)

  const hasError =
    field.state.meta.isTouched && field.state.meta.errors.length > 0
  const errorText = hasError ? field.state.meta.errors.join(', ') : null

  const raw = field.state.value
  const displayValue =
    raw === undefined || raw === null || Number.isNaN(raw)
      ? ''
      : formatDisplayValue(raw)

  const clamp = (n: number): number => {
    let v = roundToTwoDecimals(n)
    if (min !== undefined) {
      v = Math.max(roundToTwoDecimals(min), v)
    }
    if (max !== undefined) {
      v = Math.min(roundToTwoDecimals(max), v)
    }
    return roundToTwoDecimals(v)
  }

  const setFromNumber = (n: number) => {
    field.handleChange(clamp(n))
  }

  const onInputChange = (s: string) => {
    if (s === '' || s === '-') {
      field.handleChange(0)
      return
    }
    const parsed = Number.parseFloat(s)
    if (Number.isNaN(parsed)) {
      return
    }
    setFromNumber(parsed)
  }

  const bump = (delta: number) => {
    const base =
      typeof raw === 'number' && !Number.isNaN(raw)
        ? roundToTwoDecimals(raw)
        : 0
    setFromNumber(base + delta * stepNum)
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
      <InputShell data-invalid={hasError || undefined}>
        {unit ? (
          <span className="type-label shrink-0 text-gray-500">{unit}</span>
        ) : null}
        <input
          id={field.name}
          name={field.name}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder={placeholder}
          value={displayValue}
          onChange={(e) => onInputChange(e.target.value)}
          onBlur={field.handleBlur}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          className={cn(inputInnerClassName)}
        />
        <div className="flex shrink-0 flex-col">
          <ShadcnButton
            type="button"
            disabled={disabled}
            className="flex size-4 items-center justify-center rounded-sm border-0 bg-transparent p-0 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            onClick={() => bump(1)}
            aria-label={t('common.increase')}
          >
            <ChevronUpIcon
              strokeWidth={INPUT_ICON_STROKE}
              className="size-4"
            />
          </ShadcnButton>
          <ShadcnButton
            type="button"
            disabled={disabled}
            className="flex size-4 items-center justify-center rounded-sm border-0 bg-transparent p-0 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            onClick={() => bump(-1)}
            aria-label={t('common.decrease')}
          >
            <ChevronDownIcon
              strokeWidth={INPUT_ICON_STROKE}
              className="size-4"
            />
          </ShadcnButton>
        </div>
      </InputShell>
    </FormField>
  )
}
