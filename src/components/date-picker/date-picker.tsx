/**
 * DatePicker — single-date popover calendar.
 *
 * Controlled via `value` / `onChange`. No form context required.
 */

import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { useState } from 'react'
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

export type DatePickerProps = {
  value?: Date
  onChange: (date: Date) => void
  placeholder?: string
  disabled?: boolean
  id?: string
  'aria-invalid'?: boolean
  /** Icon position relative to the label text. */
  calendarPosition?: 'start' | 'end'
}

export function DatePicker({
  value,
  onChange,
  placeholder,
  disabled,
  id,
  'aria-invalid': ariaInvalid,
  calendarPosition = 'end'
}: DatePickerProps) {
  const { t } = useTranslation()
  const effectivePlaceholder = placeholder ?? t('common.pickDate')
  const [open, setOpen] = useState(false)

  const icon = (
    <CalendarIcon
      strokeWidth={INPUT_ICON_STROKE}
      className="size-4 shrink-0 text-gray-500"
      aria-hidden
    />
  )

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger asChild>
        <ShadcnButton
          type="button"
          id={id}
          disabled={disabled}
          aria-invalid={ariaInvalid}
          className={cn(
            inputShellClassName,
            'min-h-7 w-full gap-2 font-normal',
            calendarPosition === 'end' ? 'justify-between' : 'justify-start'
          )}
        >
          {calendarPosition === 'start' ? icon : null}
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-left type-label',
              value ? 'text-black' : 'text-gray-500'
            )}
          >
            {value
              ? format(value, 'PPP', { locale: sv })
              : effectivePlaceholder}
          </span>
          {calendarPosition === 'end' ? icon : null}
        </ShadcnButton>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto border border-gray-300 p-0"
        align="start"
      >
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            if (date) {
              onChange(date)
              setOpen(false)
            }
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
