# Form System Documentation

This document describes the custom TanStack Form system integrated with shadcn-ui components and Zod v4 validation.

## Overview

Our form system provides:

- **Type-safe forms** with TypeScript support
- **Pre-bound components** for consistent UI
- **Zod v4 validation** (Standard Schema spec - no adapters needed)
- **Automatic error handling** and display
- **Loading states** and form state management
- **Reusable and scalable** architecture

## Core Components

### `useAppForm`

The main hook for creating forms with pre-configured components.

```tsx
import { useAppForm } from "@/hooks/form";

const form = useAppForm({
  defaultValues: {
    name: "",
    email: "",
  },
  onSubmit: async ({ value }) => {
    console.log("Form submitted:", value);
  },
});
```

### `TextField`

A pre-bound text field component that integrates shadcn-ui Field, Label, and Input.

**Props:**

- `label` (required): Label text
- `description` (optional): Helper text shown below the label
- `placeholder` (optional): Input placeholder
- `type` (optional): Input type (text, email, password, etc.)
- `disabled` (optional): Whether the field is disabled
- `inputProps` (optional): Additional props for the Input component

### `SubmitButton`

A pre-bound submit button that automatically handles loading and disabled states.

**Props:**

- `children` (optional): Button text (default: "Submit")
- `loadingText` (optional): Text during submission (default: "Submitting...")
- `variant` (optional): Button variant (default, destructive, outline, etc.)
- `size` (optional): Button size (default, sm, lg)
- `buttonProps` (optional): Additional props for the Button component

### `CancelButton`

A pre-bound cancel button for forms. Only renders when `onCancel` is provided.

**Props:**

- `onCancel` (optional): Callback when cancel is clicked. If not provided, button won't render.
- `children` (optional): Button text (default: "Cancel")
- `variant` (optional): Button variant (default: "outline")
- `size` (optional): Button size (default, sm, lg)
- `buttonProps` (optional): Additional props for the Button component

### `DeleteButton`

A pre-bound destructive button for delete actions. Only renders when `onDelete` is provided.
Automatically positions itself to the left with `mr-auto`.

**Props:**

- `onDelete` (optional): Callback when delete is clicked. If not provided, button won't render.
- `children` (optional): Button text (default: "Delete")
- `size` (optional): Button size (default, sm, lg)
- `buttonProps` (optional): Additional props for the Button component

### `FormButtonGroup`

A layout component that arranges form action buttons in a consistent pattern:

- Delete button on the left (if provided)
- Cancel button followed by Submit button on the right

This eliminates the need to manually create button layouts in every form.

**Props:**

- `onDelete` (optional): Callback for delete action
- `onCancel` (optional): Callback for cancel action
- `submitLabel` (optional): Text for submit button (default: "Save")
- `deleteLabel` (optional): Text for delete button (default: "Delete")
- `cancelLabel` (optional): Text for cancel button (default: "Cancel")
- `loadingText` (optional): Text shown while submitting (default: "Saving...")

## Validation Helpers

We provide validation helper functions to simplify Zod integration:

### `createZodValidator`

Simplifies field-level validation:

```tsx
import { createZodValidator } from '@/lib/form-validation'

const schema = z.object({
  name: z.string().min(3),
})

// Before (manual)
<form.AppField
  name="name"
  validators={{
    onChange: ({ value }) => {
      const result = schema.shape.name.safeParse(value)
      return result.success ? undefined : result.error.issues[0]?.message
    },
  }}
>

// After (with helper)
<form.AppField
  name="name"
  validators={{
    onChange: createZodValidator(schema.shape.name),
  }}
>
```

### `createAsyncValidator`

Simplifies async validation with debouncing:

```tsx
import { createAsyncValidator } from '@/lib/form-validation'

<form.AppField
  name="email"
  validators={{
    onChange: createZodValidator(schema.shape.email),
    ...createAsyncValidator(async (value: string) => {
      const exists = await checkEmailExists(value)
      return exists ? 'Email already taken' : undefined
    }, 500), // 500ms debounce
  }}
>
```

### `validateForm`

Validates entire form and returns typed data:

```tsx
import { validateForm } from "@/lib/form-validation";

const form = useAppForm({
  defaultValues: { name: "", email: "" },
  onSubmit: async ({ value }) => {
    try {
      const data = validateForm(schema, value);
      // data is fully typed!
      console.log(data.name, data.email);
    } catch (error) {
      console.error("Validation failed:", error);
    }
  },
});
```



## Basic Usage

### 1. Create a Form

```tsx
import { useAppForm } from "@/hooks/form";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
});

export function MyForm() {
  const form = useAppForm({
    defaultValues: {
      name: "",
      email: "",
    },
    onSubmit: async ({ value }) => {
      // Validate with Zod
      const result = schema.safeParse(value);
      if (!result.success) {
        console.error("Validation failed:", result.error);
        return;
      }

      // Handle submission
      console.log("Valid data:", result.data);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      {/* Fields here */}
    </form>
  );
}
```

### 2. Add Fields

```tsx
<form.AppField
  name="name"
  validators={{
    onChange: ({ value }) => {
      const result = schema.shape.name.safeParse(value);
      return result.success ? undefined : result.error.issues[0]?.message;
    },
  }}
>
  {(field) => (
    <field.TextField
      label="Name"
      description="Enter your full name"
      placeholder="John Doe"
    />
  )}
</form.AppField>
```

### 3. Add Form Buttons

For simple forms, use just the `SubmitButton`:

```tsx
<form.AppForm>
  <form.SubmitButton>Create Account</form.SubmitButton>
</form.AppForm>
```

For forms with delete/cancel actions, use `FormButtonGroup` for consistent layout:

```tsx
<form.AppForm>
  <form.FormButtonGroup
    onDelete={handleDelete}
    onCancel={handleCancel}
    submitLabel="Save"
  />
</form.AppForm>
```

## Advanced Usage

### Async Validation

```tsx
<form.AppField
  name="email"
  validators={{
    onChange: ({ value }) => {
      const result = schema.shape.email.safeParse(value);
      return result.success ? undefined : result.error.issues[0]?.message;
    },
    onChangeAsyncDebounceMs: 500,
    onChangeAsync: async ({ value }) => {
      // Check if email exists in database
      const exists = await checkEmailExists(value);
      return exists ? "Email already taken" : undefined;
    },
  }}
>
  {(field) => <field.TextField label="Email" type="email" />}
</form.AppField>
```

### Custom Field Components

You can access the field context to create custom components:

```tsx
import { useFieldContext } from "@/hooks/form";

export function CustomField() {
  const field = useFieldContext<string>();

  return (
    <div>
      <label>{field.name}</label>
      <input
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
      />
      {field.state.meta.errors.map((error) => (
        <span key={error}>{error}</span>
      ))}
    </div>
  );
}
```

### Form State Subscription

Subscribe to specific form state changes:

```tsx
<form.Subscribe
  selector={(state) => ({
    canSubmit: state.canSubmit,
    isSubmitting: state.isSubmitting,
    isValid: state.isValid,
  })}
>
  {(state) => (
    <div>
      <p>Can Submit: {state.canSubmit ? "Yes" : "No"}</p>
      <p>Is Submitting: {state.isSubmitting ? "Yes" : "No"}</p>
      <p>Is Valid: {state.isValid ? "Yes" : "No"}</p>
    </div>
  )}
</form.Subscribe>
```

### Reset Form

```tsx
<button type="button" onClick={() => form.reset()}>
  Reset Form
</button>
```

## Zod v4 Integration

Zod v4 follows the Standard Schema specification, so no adapters are needed. Simply use Zod schemas for validation:

```tsx
import { z } from 'zod'

const schema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),

  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),

  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

// Use in validators
<form.AppField
  name="username"
  validators={{
    onChange: ({ value }) => {
      const result = schema.shape.username.safeParse(value)
      return result.success ? undefined : result.error.issues[0]?.message
    },
  }}
>
  {(field) => <field.TextField label="Username" />}
</form.AppField>
```

## Reusable Form Patterns

### Form Options Pattern

Create reusable form configurations:

```tsx
import { formOptions } from "@tanstack/react-form";

export const userFormOptions = formOptions({
  defaultValues: {
    firstName: "",
    lastName: "",
    email: "",
  },
});

// Use in multiple components
const form = useAppForm({
  ...userFormOptions,
  onSubmit: async ({ value }) => {
    // Handle submission
  },
});
```

### Form Composition with `withForm`

Create reusable form components:

```tsx
import { withForm } from '@/hooks/form'
import { userFormOptions } from './userFormOptions'

export const UserForm = withForm({
  ...userFormOptions,
  props: {
    title: 'User Form',
    showDebug: false,
  },
  render: ({ form, title, showDebug }) => {
    return (
      <div>
        <h2>{title}</h2>
        <form onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}>
          <form.AppField name="firstName">
            {(field) => <field.TextField label="First Name" />}
          </form.AppField>

          <form.AppForm>
            <form.SubmitButton />
          </form.AppForm>
        </form>
      </div>
    )
  },
})

// Use it
<UserForm form={form} title="Edit Profile" showDebug={true} />
```

## Adding More Field Components

To add more pre-bound field components:

1. Create the component in `src/components/form/`:

```tsx
// src/components/form/TextAreaField.tsx
import { useFieldContext } from "@/hooks/form";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

export function TextAreaField({ label, placeholder }) {
  const field = useFieldContext<string>();
  const hasError =
    field.state.meta.isTouched && field.state.meta.errors.length > 0;

  return (
    <Field data-invalid={hasError || undefined}>
      <FieldContent>
        <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
        <Textarea
          id={field.name}
          name={field.name}
          placeholder={placeholder}
          value={field.state.value ?? ""}
          onChange={(e) => field.handleChange(e.target.value)}
          onBlur={field.handleBlur}
        />
        {hasError && (
          <FieldError>{field.state.meta.errors.join(", ")}</FieldError>
        )}
      </FieldContent>
    </Field>
  );
}
```

2. Add it to `src/hooks/form.ts`:

```tsx
import { TextAreaField } from "@/components/form/TextAreaField";

export const { useAppForm, withForm } = createFormHook({
  fieldComponents: {
    TextField,
    TextAreaField, // Add here
  },
  formComponents: {
    SubmitButton,
  },
  fieldContext,
  formContext,
});
```

3. Use it in your forms:

```tsx
<form.AppField name="bio">
  {(field) => (
    <field.TextAreaField label="Bio" placeholder="Tell us about yourself" />
  )}
</form.AppField>
```



### Complete Login Form Example

Here is a complete example of a login form using the validation helpers:

```tsx
import { z } from 'zod'
import { useAppForm } from '@/hooks/form'
import {
	createAsyncValidator,
	createZodValidator,
	validateForm
} from '@/lib/form-validation'

const loginSchema = z.object({
	email: z.string().email('Invalid email address'),
	password: z.string().min(8, 'Password must be at least 8 characters')
})

export function LoginForm() {
	const form = useAppForm({
		defaultValues: {
			email: '',
			password: ''
		},
		onSubmit: async ({ value }) => {
			try {
				const data = validateForm(loginSchema, value)
				console.log('Valid login data:', data)
				// Handle login...
			} catch (error) {
				console.error('Validation failed:', error)
			}
		}
	})

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault()
				e.stopPropagation()
				form.handleSubmit()
			}}
			className="space-y-4"
		>
			<form.AppField
				name="email"
				validators={{
					// Sync validation
					onChange: createZodValidator(loginSchema.shape.email),
					// Async validation example
					...createAsyncValidator(async (value: string) => {
						await new Promise((resolve) => setTimeout(resolve, 300))
						if (value === 'notfound@example.com') {
							return 'This email is not registered'
						}
						return undefined
					}, 500)
				}}
			>
				{(field) => (
					<field.TextField
						label="Email"
						type="email"
						placeholder="you@example.com"
					/>
				)}
			</form.AppField>

			<form.AppField
				name="password"
				validators={{
					onChange: createZodValidator(loginSchema.shape.password)
				}}
			>
				{(field) => (
					<field.TextField
						label="Password"
						type="password"
						placeholder="••••••••"
					/>
				)}
			</form.AppField>

			<form.AppForm>
				<form.SubmitButton>Sign In</form.SubmitButton>
			</form.AppForm>
		</form>
	)
}
```

## Examples

### Complex Validation with Address Form

```tsx
const addressSchema = z.object({
    street: z.string().min(1, 'Street is required'),
    city: z.string().min(1, 'City is required'),
    zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid zip code'),
})

// nesting fields
<form.AppField name="address.street">
    {(field) => <field.TextField label="Street" />}
</form.AppField>
```

### Disabled Fields

```tsx
<form.AppField name="userId">
    {(field) => (
        <field.TextField
            label="User ID"
            description="This field cannot be modified"
            disabled={true}
        />
    )}
</form.AppField>
```


## Best Practices

1. **Keep schemas close to forms**: Define validation schemas near the forms that use them
2. **Use field-level validation**: Validate individual fields on change for better UX
3. **Use form-level validation**: Validate the entire form on submit for complex cross-field validations
4. **Debounce async validation**: Use `onChangeAsyncDebounceMs` to avoid excessive API calls
5. **Show validation on blur**: Use `onBlur` validators for less intrusive validation
6. **Reuse form options**: Create reusable `formOptions` for common form patterns
7. **Compose forms**: Use `withForm` to create reusable form components
8. **Type safety**: Always define types for your form data using `z.infer<typeof schema>`
9. **Use FormButtonGroup**: For forms with delete/cancel/submit actions, use `FormButtonGroup` for consistent layout
10. **Use validation helpers**: Always use `createZodValidator` for field validation and `validateForm` for submit validation

## Resources

- [TanStack Form Docs](https://tanstack.com/form/latest/docs/overview)
- [TanStack Form Composition Guide](https://tanstack.com/form/latest/docs/framework/react/guides/form-composition)
- [shadcn-ui Forms with TanStack Form](https://ui.shadcn.com/docs/forms/tanstack-form)
- [Zod Documentation](https://zod.dev/)
- [Standard Schema Specification](https://github.com/standard-schema/standard-schema)
