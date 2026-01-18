/**
 * TextField component for TanStack Form
 *
 * Integrates shadcn-ui Field, Label, and Input components with TanStack Form
 * Automatically handles validation errors and field states
 */

import { useFieldContext } from '@/hooks/form'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export interface TextFieldProps {
  /**
   * Label text for the field
   */
  label: string

  /**
   * Optional description text shown below the label
   */
  description?: string

  /**
   * Optional placeholder text for the input
   */
  placeholder?: string

  /**
   * Input type (text, email, password, etc.)
   * @default "text"
   */
  type?: React.ComponentProps<typeof Input>['type']

  /**
   * Whether the field is disabled
   */
  disabled?: boolean

  /**
   * Additional props to pass to the Input component
   */
  inputProps?: Omit<
    React.ComponentProps<typeof Input>,
    'value' | 'onChange' | 'onBlur' | 'id' | 'name' | 'type' | 'disabled' | 'aria-invalid'
  >
}

export function TextField({
  label,
  description,
  placeholder,
  type = 'text',
  disabled,
  inputProps,
}: TextFieldProps) {
  const field = useFieldContext<string>()

  const hasError = field.state.meta.isTouched && field.state.meta.errors.length > 0

  return (
    <Field data-invalid={hasError || undefined}>
      <FieldContent>
        <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
        {description && <FieldDescription>{description}</FieldDescription>}
        <Input
          id={field.name}
          name={field.name}
          type={type}
          placeholder={placeholder}
          value={field.state.value ?? ''}
          onChange={(e) => field.handleChange(e.target.value)}
          onBlur={field.handleBlur}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          {...inputProps}
        />
        {hasError && (
          <FieldError>
            {field.state.meta.errors.join(', ')}
          </FieldError>
        )}
        {field.state.meta.isValidating && (
          <span className="text-sm text-muted-foreground">Validating...</span>
        )}
      </FieldContent>
    </Field>
  )
}
