/**
 * Example demonstrating how to use the custom form system
 *
 * This example shows:
 * - Basic form setup with useAppForm
 * - Using pre-bound TextField component
 * - Using pre-bound SubmitButton component
 * - Zod v4 validation (Standard Schema spec)
 * - Error handling and display
 */

import { useAppForm } from '@/hooks/form'
import { z } from 'zod'

// Define Zod schema for validation
// Zod v4 follows Standard Schema spec, so no adapter needed
const userSchema = z.object({
  firstName: z.string().min(3, 'First name must be at least 3 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  age: z.string().refine((val) => {
    const num = Number.parseInt(val, 10)
    return !Number.isNaN(num) && num >= 18 && num <= 120
  }, 'Age must be between 18 and 120'),
})

type UserFormData = z.infer<typeof userSchema>

export function ExampleUserForm() {
  // Initialize form with useAppForm
  const form = useAppForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      age: '',
    } satisfies UserFormData,
    onSubmit: async ({ value }) => {
      // Validate the entire form with Zod
      const result = userSchema.safeParse(value)

      if (!result.success) {
        console.error('Validation failed:', result.error)
        return
      }

      // Handle successful submission
      console.log('Form submitted:', result.data)

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      alert('Form submitted successfully!')
    },
  })

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold">User Registration</h1>
        <p className="text-muted-foreground mt-2">
          Example form using TanStack Form with Zod validation
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          form.handleSubmit()
        }}
        className="space-y-6"
      >
        {/* First Name Field */}
        <form.AppField
          name="firstName"
          validators={{
            onChange: ({ value }) => {
              const result = userSchema.shape.firstName.safeParse(value)
              return result.success ? undefined : result.error.issues[0]?.message
            },
          }}
        >
          {(field) => (
            <field.TextField
              label="First Name"
              description="Enter your first name"
              placeholder="John"
            />
          )}
        </form.AppField>

        {/* Last Name Field */}
        <form.AppField
          name="lastName"
          validators={{
            onChange: ({ value }) => {
              const result = userSchema.shape.lastName.safeParse(value)
              return result.success ? undefined : result.error.issues[0]?.message
            },
          }}
        >
          {(field) => (
            <field.TextField
              label="Last Name"
              description="Enter your last name"
              placeholder="Doe"
            />
          )}
        </form.AppField>

        {/* Email Field */}
        <form.AppField
          name="email"
          validators={{
            onChange: ({ value }) => {
              const result = userSchema.shape.email.safeParse(value)
              return result.success ? undefined : result.error.issues[0]?.message
            },
            onChangeAsyncDebounceMs: 500,
            onChangeAsync: async ({ value }) => {
              // Simulate async validation (e.g., checking if email exists)
              await new Promise((resolve) => setTimeout(resolve, 500))

              if (value.includes('taken')) {
                return 'This email is already taken'
              }

              return undefined
            },
          }}
        >
          {(field) => (
            <field.TextField
              label="Email"
              description="We'll never share your email"
              placeholder="john.doe@example.com"
              type="email"
            />
          )}
        </form.AppField>

        {/* Age Field */}
        <form.AppField
          name="age"
          validators={{
            onChange: ({ value }) => {
              const result = userSchema.shape.age.safeParse(value)
              return result.success ? undefined : result.error.issues[0]?.message
            },
          }}
        >
          {(field) => (
            <field.TextField
              label="Age"
              description="You must be 18 or older"
              placeholder="25"
              type="number"
            />
          )}
        </form.AppField>

        {/* Form Actions */}
        <div className="flex gap-4">
          <form.AppForm>
            <form.SubmitButton>Create Account</form.SubmitButton>
          </form.AppForm>

          <button
            type="button"
            onClick={() => form.reset()}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Reset
          </button>
        </div>

        {/* Form State Debug (remove in production) */}
        <div className="rounded-lg border p-4 bg-muted/50">
          <p className="text-sm font-medium mb-2">Form State (Debug)</p>
          <form.Subscribe
            selector={(state) => ({
              canSubmit: state.canSubmit,
              isSubmitting: state.isSubmitting,
              isTouched: state.isTouched,
              isDirty: state.isDirty,
              isValid: state.isValid,
            })}
          >
            {(state) => (
              <pre className="text-xs overflow-auto">
                {JSON.stringify(state, null, 2)}
              </pre>
            )}
          </form.Subscribe>
        </div>
      </form>
    </div>
  )
}
