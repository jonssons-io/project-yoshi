/**
 * DateRangeField — date range with calendar popover
 */

import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { useTranslation } from 'react-i18next'
import { FormField } from '@/components/form-field/form-field'
import {
  INPUT_ICON_STROKE,
  inputShellClassName
} from '@/components/input-shell/input-shell'
import { ShadcnButton } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { useFieldContext } from '@/hooks/form'
import { cn } from '@/lib/utils'

function formatRange(range: DateRange | undefined, locale: typeof sv): string {
  if (!range?.from) {
    return ''
  }
  if (!range.to) {
    return format(range.from, 'P', {
      locale
    })
  }
  return `${format(range.from, 'P', {
    locale
  })} – ${format(range.to, 'P', {
    locale
  })}`
}

export interface DateRangeFieldProps {
  label: string
  labelHelpText?: string
  description?: string
  placeholder?: string
  disabled?: boolean
}

export function DateRangeField({
  label,
  labelHelpText,
  description,
  placeholder,
  disabled
}: DateRangeFieldProps) {
  const { t } = useTranslation()
  const effectivePlaceholder = placeholder ?? t('common.pickDate')

  const field = useFieldContext<DateRange | undefined>()

  const hasError =
    field.state.meta.isTouched && field.state.meta.errors.length > 0
  const errorText = hasError ? field.state.meta.errors.join(', ') : null

  const display = formatRange(field.state.value, sv)

  return (
    <FormField
      label={label}
      labelHelpText={labelHelpText}
      description={description}
      fieldId={field.name}
      error={errorText}
      isValidating={Boolean(field.state.meta.isValidating && !hasError)}
    >
      <Popover>
        <PopoverTrigger asChild>
          <ShadcnButton
            type="button"
            id={field.name}
            disabled={disabled}
            aria-invalid={hasError || undefined}
            className={cn(
              inputShellClassName,
              'min-h-7 w-full justify-between gap-2 font-normal'
            )}
          >
            <span
              className={cn(
                'min-w-0 flex-1 truncate text-left type-label',
                display ? 'text-black' : 'text-gray-500'
              )}
            >
              {display || effectivePlaceholder}
            </span>
            <CalendarIcon
              strokeWidth={INPUT_ICON_STROKE}
              className="size-4 shrink-0 text-gray-500"
              aria-hidden
            />
          </ShadcnButton>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto border border-gray-300 p-0"
          align="start"
        >
          <Calendar
            mode="range"
            selected={field.state.value}
            onSelect={(range) => {
              field.handleChange(range)
            }}
            initialFocus
            locale={sv}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </FormField>
  )
}
