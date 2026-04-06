/**
 * DateRangePicker — range-selection popover calendar.
 *
 * Controlled via `value` / `onChange`.  Uses a two-step state machine so the
 * popover stays open until the user has picked both start and end dates.
 */

import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { useTranslation } from 'react-i18next'
import { Calendar } from '@/components/calendar/calendar'
import {
  INPUT_ICON_STROKE,
  inputShellClassName
} from '@/components/input-shell/input-shell'
import { ShadcnButton } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

/** A fully-resolved range where both dates are present. */
export type DateRangeValue = {
  from: Date
  to: Date
}

export type DateRangePickerProps = {
  /** Current range — may be partial or undefined (e.g. filter drawers). */
  value?: DateRange
  /** Called with a complete range once the user picks both start and end. */
  onChange: (range: DateRangeValue) => void
  placeholder?: string
  disabled?: boolean
  numberOfMonths?: number
  /** Popover alignment relative to the trigger. */
  align?: 'start' | 'center' | 'end'
  /** Preferred side the popover opens on. */
  side?: 'top' | 'right' | 'bottom' | 'left'
  className?: string
}

function formatRangeLabel(range: DateRange | undefined): string {
  if (!range?.from) return ''
  if (!range.to)
    return format(range.from, 'P', {
      locale: sv
    })
  return `${format(range.from, 'P', {
    locale: sv
  })} – ${format(range.to, 'P', {
    locale: sv
  })}`
}

export function DateRangePicker({
  value,
  onChange,
  placeholder,
  disabled,
  numberOfMonths = 2,
  align = 'start',
  side,
  className
}: DateRangePickerProps) {
  const { t } = useTranslation()
  const effectivePlaceholder = placeholder ?? t('common.pickDate')

  const [open, setOpen] = useState(false)

  // `pending` tracks in-progress selection inside the popover.
  // undefined = no click yet since opening (calendar shows committed value).
  // { from, to: undefined } = first click happened, waiting for second.
  const [pending, setPending] = useState<DateRange | undefined>()

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setPending(undefined)
    }
  }

  const handleSelect = (range: DateRange | undefined) => {
    if (!range?.from) {
      setPending(undefined)
      return
    }

    if (range?.from && range?.to) {
      setPending(undefined)
      onChange({
        from: range.from,
        to: range.to
      })
      setOpen(false)
      return
    }

    // Shouldn't normally reach here, but keep state in sync.
    setPending(range)
  }

  const displayed: DateRange | undefined = pending ?? value

  const display = formatRangeLabel(value)

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
    >
      <PopoverTrigger asChild>
        <ShadcnButton
          type="button"
          disabled={disabled}
          className={cn(
            inputShellClassName,
            'min-h-7 w-full justify-between gap-2 font-normal',
            className
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
        align={align}
        side={side}
      >
        <Calendar
          mode="range"
          selected={displayed}
          onSelect={handleSelect}
          resetOnSelect
          autoFocus
          numberOfMonths={numberOfMonths}
          showOutsideDays={false}
        />
      </PopoverContent>
    </Popover>
  )
}
