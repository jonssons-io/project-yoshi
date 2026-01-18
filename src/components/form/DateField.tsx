/**
 * DateField component for TanStack Form
 *
 * Integrates shadcn-ui Field, Calendar, and Popover with TanStack Form
 * Provides a date picker with calendar dropdown
 */

import { useFieldContext } from '@/hooks/form'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'

export interface DateFieldProps {
  /**
   * Label text for the field
   */
  label: string

  /**
   * Optional description text shown below the label
   */
  description?: string

  /**
   * Optional placeholder text when no date is selected
   */
  placeholder?: string

  /**
   * Whether the field is disabled
   */
  disabled?: boolean
}

export function DateField({
  label,
  description,
  placeholder = 'Pick a date',
  disabled,
}: DateFieldProps) {
  const field = useFieldContext<Date>()

  const hasError = field.state.meta.isTouched && field.state.meta.errors.length > 0

  return (
    <Field data-invalid={hasError || undefined}>
      <FieldContent>
        <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
        {description && <FieldDescription>{description}</FieldDescription>}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id={field.name}
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !field.state.value && 'text-muted-foreground',
              )}
              disabled={disabled}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {field.state.value ? (
                format(field.state.value, 'PPP')
              ) : (
                <span>{placeholder}</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={field.state.value}
              onSelect={(date) => {
                if (date) {
                  field.handleChange(date)
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {hasError && (
          <FieldError>{field.state.meta.errors.join(', ')}</FieldError>
        )}
        {field.state.meta.isValidating && (
          <span className="text-sm text-muted-foreground">Validating...</span>
        )}
      </FieldContent>
    </Field>
  )
}
