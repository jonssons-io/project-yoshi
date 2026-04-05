/**
 * App-level Calendar wrapper.
 *
 * Locks the locale to `sv` and re-exports the shadcn Calendar primitive
 * so routes / features never import from `ui/calendar` directly.
 */

import { sv } from 'date-fns/locale'
import type { ComponentProps } from 'react'
import { Calendar as ShadcnCalendar } from '@/components/ui/calendar'

type CalendarProps = ComponentProps<typeof ShadcnCalendar>

function Calendar(props: CalendarProps) {
  return (
    <ShadcnCalendar
      locale={sv}
      {...props}
    />
  )
}

export { Calendar }
export type { CalendarProps }
