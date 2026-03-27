import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { useTranslation } from 'react-i18next'
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
import { cn } from '@/lib/utils'

function formatRange(value: DateRange | undefined): string {
  if (!value?.from) return ''
  if (!value.to) {
    return format(value.from, 'P', {
      locale: sv
    })
  }
  return `${format(value.from, 'P', {
    locale: sv
  })} – ${format(value.to, 'P', {
    locale: sv
  })}`
}

export type DateRangePickerProps = {
  value?: DateRange
  onChange: (value: DateRange | undefined) => void
  placeholder?: string
  disabled?: boolean
}

/**
 * Standalone controlled date-range picker that matches the shared input shell.
 */
export function DateRangePicker({
  value,
  onChange,
  placeholder,
  disabled
}: DateRangePickerProps) {
  const { t } = useTranslation()
  const displayValue = formatRange(value)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <ShadcnButton
          type="button"
          disabled={disabled}
          className={cn(
            inputShellClassName,
            'min-h-7 w-full justify-between gap-2 font-normal'
          )}
        >
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-left type-label',
              displayValue ? 'text-black' : 'text-gray-500'
            )}
          >
            {displayValue || placeholder || t('common.pickDate')}
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
          selected={value}
          onSelect={onChange}
          initialFocus
          locale={sv}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  )
}
