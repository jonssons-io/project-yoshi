/**
 * Quick Reference: Form System
 *
 * Common patterns and snippets for using the TanStack Form system
 */

import { useAppForm } from '@/hooks/form'
import { z } from 'zod'

// ============================================================================
// BASIC FORM SETUP
// ============================================================================

const basicSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
})

function BasicFormExample() {
  const form = useAppForm({
    defaultValues: {
      name: '',
      email: '',
    },
    onSubmit: async ({ value }) => {
      const result = basicSchema.safeParse(value)
      if (!result.success) return
      console.log(result.data)
    },
  })

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      e.stopPropagation()
      form.handleSubmit()
    }}>
      <form.AppField
        name="name"
        validators={{
          onChange: ({ value }) => {
            const result = basicSchema.shape.name.safeParse(value)
            return result.success ? undefined : result.error.issues[0]?.message
          },
        }}
      >
        {(field) => <field.TextField label="Name" />}
      </form.AppField>

      <form.AppForm>
        <form.SubmitButton />
      </form.AppForm>
    </form>
  )
}

// ============================================================================
// FIELD WITH ASYNC VALIDATION
// ============================================================================

function AsyncValidationExample() {
  const form = useAppForm({
    defaultValues: { username: '' },
    onSubmit: async ({ value }) => console.log(value),
  })

  return (
    <form.AppField
      name="username"
      validators={{
        onChange: ({ value }) =>
          value.length < 3 ? 'Username must be at least 3 characters' : undefined,
        onChangeAsyncDebounceMs: 500,
        onChangeAsync: async ({ value }) => {
          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 500))
          return value.includes('taken') ? 'Username is taken' : undefined
        },
      }}
    >
      {(field) => <field.TextField label="Username" />}
    </form.AppField>
  )
}

// ============================================================================
// MULTIPLE FIELD TYPES
// ============================================================================

function MultipleFieldsExample() {
  const form = useAppForm({
    defaultValues: {
      text: '',
      email: '',
      password: '',
      number: '',
    },
    onSubmit: async ({ value }) => console.log(value),
  })

  return (
    <>
      <form.AppField name="text">
        {(field) => <field.TextField label="Text" type="text" />}
      </form.AppField>

      <form.AppField name="email">
        {(field) => <field.TextField label="Email" type="email" />}
      </form.AppField>

      <form.AppField name="password">
        {(field) => <field.TextField label="Password" type="password" />}
      </form.AppField>

      <form.AppField name="number">
        {(field) => <field.TextField label="Age" type="number" />}
      </form.AppField>
    </>
  )
}

// ============================================================================
// FORM STATE SUBSCRIPTION
// ============================================================================

function FormStateExample() {
  const form = useAppForm({
    defaultValues: { name: '' },
    onSubmit: async ({ value }) => console.log(value),
  })

  return (
    <>
      <form.Subscribe
        selector={(state) => ({
          canSubmit: state.canSubmit,
          isSubmitting: state.isSubmitting,
          isValid: state.isValid,
          isTouched: state.isTouched,
          isDirty: state.isDirty,
        })}
      >
        {(state) => (
          <div>
            <p>Can Submit: {state.canSubmit ? '✓' : '✗'}</p>
            <p>Is Submitting: {state.isSubmitting ? '✓' : '✗'}</p>
            <p>Is Valid: {state.isValid ? '✓' : '✗'}</p>
            <p>Is Touched: {state.isTouched ? '✓' : '✗'}</p>
            <p>Is Dirty: {state.isDirty ? '✓' : '✗'}</p>
          </div>
        )}
      </form.Subscribe>
    </>
  )
}

// ============================================================================
// CUSTOM SUBMIT BUTTON VARIANTS
// ============================================================================

function CustomButtonsExample() {
  const form = useAppForm({
    defaultValues: { name: '' },
    onSubmit: async ({ value }) => console.log(value),
  })

  return (
    <div className="flex gap-4">
      <form.AppForm>
        {/* Default */}
        <form.SubmitButton>Submit</form.SubmitButton>
      </form.AppForm>

      <form.AppForm>
        {/* Destructive variant */}
        <form.SubmitButton variant="destructive">Delete</form.SubmitButton>
      </form.AppForm>

      <form.AppForm>
        {/* Outline variant, large size */}
        <form.SubmitButton variant="outline" size="lg">
          Save Draft
        </form.SubmitButton>
      </form.AppForm>

      <form.AppForm>
        {/* Custom loading text */}
        <form.SubmitButton loadingText="Saving...">Save</form.SubmitButton>
      </form.AppForm>
    </div>
  )
}

// ============================================================================
// RESET FORM
// ============================================================================

function ResetFormExample() {
  const form = useAppForm({
    defaultValues: { name: '' },
    onSubmit: async ({ value }) => console.log(value),
  })

  return (
    <div className="flex gap-4">
      <form.AppForm>
        <form.SubmitButton>Submit</form.SubmitButton>
      </form.AppForm>

      <button
        type="button"
        onClick={() => form.reset()}
        className="px-4 py-2 text-sm"
      >
        Reset
      </button>
    </div>
  )
}

// ============================================================================
// COMPLEX ZOD VALIDATION
// ============================================================================

const complexSchema = z.object({
  username: z.string()
    .min(3, 'Min 3 characters')
    .max(20, 'Max 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Alphanumeric and underscores only'),

  email: z.string().email('Invalid email'),

  password: z.string()
    .min(8, 'Min 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[0-9]/, 'Must contain number'),

  age: z.string()
    .refine((val) => {
      const num = Number.parseInt(val, 10)
      return !Number.isNaN(num) && num >= 18 && num <= 120
    }, 'Must be between 18 and 120'),
})

function ComplexValidationExample() {
  const form = useAppForm({
    defaultValues: {
      username: '',
      email: '',
      password: '',
      age: '',
    },
    onSubmit: async ({ value }) => {
      const result = complexSchema.safeParse(value)
      if (!result.success) {
        console.error(result.error)
        return
      }
      console.log('Valid:', result.data)
    },
  })

  return (
    <>
      <form.AppField
        name="username"
        validators={{
          onChange: ({ value }) => {
            const result = complexSchema.shape.username.safeParse(value)
            return result.success ? undefined : result.error.issues[0]?.message
          },
        }}
      >
        {(field) => <field.TextField label="Username" />}
      </form.AppField>

      {/* Similar for other fields */}
    </>
  )
}

// ============================================================================
// FIELD WITH DESCRIPTION
// ============================================================================

function FieldWithDescriptionExample() {
  const form = useAppForm({
    defaultValues: { email: '' },
    onSubmit: async ({ value }) => console.log(value),
  })

  return (
    <form.AppField name="email">
      {(field) => (
        <field.TextField
          label="Email"
          description="We'll never share your email with anyone"
          placeholder="you@example.com"
          type="email"
        />
      )}
    </form.AppField>
  )
}

// ============================================================================
// DISABLED FIELD
// ============================================================================

function DisabledFieldExample() {
  const form = useAppForm({
    defaultValues: { userId: '12345' },
    onSubmit: async ({ value }) => console.log(value),
  })

  return (
    <form.AppField name="userId">
      {(field) => (
        <field.TextField
          label="User ID"
          description="This field cannot be modified"
          disabled={true}
        />
      )}
    </form.AppField>
  )
}

export {
  BasicFormExample,
  AsyncValidationExample,
  MultipleFieldsExample,
  FormStateExample,
  CustomButtonsExample,
  ResetFormExample,
  ComplexValidationExample,
  FieldWithDescriptionExample,
  DisabledFieldExample,
}
