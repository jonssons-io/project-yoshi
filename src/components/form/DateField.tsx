/**
 * DateField — single date with calendar popover
 */

import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
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

export interface DateFieldProps {
  label: string
  labelHelpText?: string
  description?: string
  placeholder?: string
  disabled?: boolean
  /** Calendar icon before the value (default: after). */
  calendarPosition?: 'start' | 'end'
}

export function DateField({
  label,
  labelHelpText,
  description,
  placeholder,
  disabled,
  calendarPosition = 'end'
}: DateFieldProps) {
  const { t } = useTranslation()
  const effectivePlaceholder = placeholder || t('common.pickDate')

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
      <Popover>
        <PopoverTrigger asChild>
          <ShadcnButton
            type="button"
            id={field.name}
            disabled={disabled}
            aria-invalid={hasError || undefined}
            className={cn(
              inputShellClassName,
              'min-h-7 w-full gap-2 font-normal',
              calendarPosition === 'end' ? 'justify-between' : 'justify-start'
            )}
          >
            {calendarPosition === 'start' ? (
              <CalendarIcon
                strokeWidth={INPUT_ICON_STROKE}
                className="size-4 shrink-0 text-gray-500"
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                'min-w-0 flex-1 truncate text-left type-label',
                field.state.value ? 'text-black' : 'text-gray-500'
              )}
            >
              {field.state.value
                ? format(field.state.value, 'PPP', {
                    locale: sv
                  })
                : effectivePlaceholder}
            </span>
            {calendarPosition === 'end' ? (
              <CalendarIcon
                strokeWidth={INPUT_ICON_STROKE}
                className="size-4 shrink-0 text-gray-500"
                aria-hidden
              />
            ) : null}
          </ShadcnButton>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto border border-gray-300 p-0"
          align="start"
        >
          <Calendar
            mode="single"
            selected={field.state.value}
            onSelect={(date) => {
              if (date) {
                field.handleChange(date)
              }
            }}
            autoFocus
            locale={sv}
          />
        </PopoverContent>
      </Popover>
    </FormField>
  )
}
