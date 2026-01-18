/**
 * Form system exports
 *
 * Import everything you need from this single file
 */

// Core form hooks and utilities
export { useAppForm, withForm, useFieldContext, useFormContext } from '@/hooks/form'

// Pre-built field components
export { TextField } from '@/components/form/TextField'
export { DateField } from '@/components/form/DateField'
export { SelectField } from '@/components/form/SelectField'
export { NumberField } from '@/components/form/NumberField'
export { SubmitButton } from '@/components/form/SubmitButton'

// Validation helpers
export {
  createZodValidator,
  createAsyncValidator,
  createFormValidator,
  validateForm,
  safeValidateForm,
  getZodErrors,
} from '@/lib/form-validation'

// Types (if you need them)
export type { TextFieldProps } from '@/components/form/TextField'
export type { DateFieldProps } from '@/components/form/DateField'
export type { SelectFieldProps } from '@/components/form/SelectField'
export type { NumberFieldProps } from '@/components/form/NumberField'
export type { SubmitButtonProps } from '@/components/form/SubmitButton'
