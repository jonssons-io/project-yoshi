/**
 * Utility functions for form validation
 *
 * These helpers simplify Zod validation integration with TanStack Form
 */

import type { z } from 'zod'

/**
 * Creates a validator function from a Zod schema
 *
 * @example
 * ```tsx
 * const schema = z.object({
 *   name: z.string().min(3),
 * })
 *
 * <form.AppField
 *   name="name"
 *   validators={{
 *     onChange: createZodValidator(schema.shape.name),
 *   }}
 * >
 *   {(field) => <field.TextField label="Name" />}
 * </form.AppField>
 * ```
 */
export function createZodValidator<T extends z.ZodType>(schema: T) {
  return ({ value }: { value: unknown }) => {
    const result = schema.safeParse(value)
    return result.success ? undefined : result.error.issues[0]?.message
  }
}

/**
 * Creates an async validator function with debouncing
 *
 * @example
 * ```tsx
 * <form.AppField
 *   name="email"
 *   validators={{
 *     onChange: createZodValidator(schema.shape.email),
 *     ...createAsyncValidator(async (value) => {
 *       const exists = await checkEmailExists(value)
 *       return exists ? 'Email already taken' : undefined
 *     }, 500),
 *   }}
 * >
 *   {(field) => <field.TextField label="Email" />}
 * </form.AppField>
 * ```
 */
export function createAsyncValidator<T>(
  validator: (value: T) => Promise<string | undefined>,
  debounceMs = 500,
) {
  return {
    onChangeAsyncDebounceMs: debounceMs,
    onChangeAsync: async ({ value }: { value: T }) => {
      return await validator(value)
    },
  }
}

/**
 * Creates form-level validators for cross-field validation
 *
 * @example
 * ```tsx
 * const schema = z.object({
 *   password: z.string().min(8),
 *   confirmPassword: z.string(),
 * }).refine((data) => data.password === data.confirmPassword, {
 *   message: "Passwords don't match",
 *   path: ['confirmPassword'],
 * })
 *
 * const form = useAppForm({
 *   defaultValues: { password: '', confirmPassword: '' },
 *   validators: {
 *     onChange: createFormValidator(schema),
 *   },
 *   onSubmit: async ({ value }) => console.log(value),
 * })
 * ```
 */
export function createFormValidator<T>(schema: z.ZodType<T>) {
  return ({ value }: { value: unknown }) => {
    const result = schema.safeParse(value)
    if (result.success) {
      return undefined
    }

    // Return the first error message
    return result.error.issues[0]?.message
  }
}

/**
 * Helper to get all validation errors from a Zod error
 */
export function getZodErrors(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))
}

/**
 * Type-safe helper to validate a form value with Zod
 * Returns the parsed data or throws with formatted errors
 */
export function validateForm<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)

  if (!result.success) {
    const errors = getZodErrors(result.error)
    throw new Error(
      `Form validation failed:\n${errors.map((e) => `- ${e.path}: ${e.message}`).join('\n')}`,
    )
  }

  return result.data
}

/**
 * Helper to safely validate and return data or null
 */
export function safeValidateForm<T>(
  schema: z.ZodType<T>,
  value: unknown,
): { success: true; data: T } | { success: false; errors: ReturnType<typeof getZodErrors> } {
  const result = schema.safeParse(value)

  if (result.success) {
    return { success: true, data: result.data }
  }

  return { success: false, errors: getZodErrors(result.error) }
}
