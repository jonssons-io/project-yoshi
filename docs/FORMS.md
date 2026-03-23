# Form System Documentation

This document describes the custom TanStack Form system integrated with Zod v4 validation, shared **`FormField`** layout, and design-system input primitives (`InputShell`, `ui/input`, etc.).

## Overview

Our form system provides:

- **Type-safe forms** with TypeScript support
- **Pre-bound components** for consistent UI
- **Zod v4 validation** (Standard Schema spec - no adapters needed)
- **Automatic error handling** and display
- **Loading states** and form state management
- **Reusable and scalable** architecture
- **Shared field shell** (`FormField`) and input primitives aligned with the app design system

## Core Components

### `useAppForm`

The main hook for creating forms with pre-bound field and form components. Field UI components are registered in `src/hooks/form.ts` and used as `field.TextField`, `field.SelectField`, etc.

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

### Field layout (`FormField`)

Pre-bound fields use **`FormField`** (`src/components/form-field/form-field.tsx`) for the outer structure:

- **Layout**: vertical stack with **4px** gap (`gap-1`), no padding on the field root.
- **Label**: `type-label`, `text-gray-800`.
- **`labelHelpText`** (optional): when set, shows a **?** control on the same row as the label with the text in a tooltip.
- **`description`**: assistive text (`type-label-small`, `text-gray-800`). Omitted when the field has a validation error (errors replace assistive text for that slot).
- **Errors**: from TanStack Field meta (`validators` on `AppField`); shown as `type-label-small`, `text-red-700`.
- **Validating**: optional “validating” line when `meta.isValidating` is true and there is no error.
- **`groupLabelId`** (optional): when set, the title is a `<span id={…}>` (no `htmlFor`) so a **`fieldset`** can use `aria-labelledby` — used by **`CheckboxGroupField`** and available for custom grouped controls.

Typography utilities are defined in `src/styles.css` (e.g. `type-label`, `type-label-small`, `type-body-medium`). **Input value text, placeholders, select/combobox/multiselect options, checkbox and radio row labels, command palette rows, and textarea content** use **`type-label`** (with **`type-label-small`** for `SelectLabel` group headings). Control chrome uses **`InputShell`** / **`ui/input`** / **`ui/select`** / **`ui/textarea`** as documented in those modules.

For **custom** controls, compose **`FormField`** yourself (also exported from `@/components/form`) and wire `fieldId`, `error`, and `isValidating` from `useFieldContext`.

### Pre-bound field components (`field.*`)

Use these inside `<form.AppField name="...">` as render props, e.g. `<field.TextField label="Name" />`.

| Component | Value type | Summary |
| --- | --- | --- |
| `TextField` | `string` | Text-like input; optional Lucide `prependIcon`. |
| `NumberField` | `number` | Text input with `inputMode="decimal"`; values are rounded to **at most two decimal places**. Chevron **step** is a **positive integer**, **default `1`** (usually omitted). Optional `unit`. |
| `SelectField` | `string` | Radix `Select`; options as `{ value, label }[]`. |
| `ComboboxField` | `ComboboxValue` | Searchable single select; optional inline create (`allowCreate`). |
| `MultiselectField` | `string[]` | Search + checkbox list; selected values as pills in the trigger. |
| `DateField` | `Date` | Single date + calendar popover. |
| `DateRangeField` | `DateRange \| undefined` | Range + calendar (`react-day-picker`). |
| `CheckboxField` | `boolean` | **Single** checkbox: optional `fieldLabel` (top) + `label` (beside control). Omit `fieldLabel` only for a solo checkbox. |
| `CheckboxGroupField` | `string[]` | **Several** checkboxes: **required** field `label` + options; selected values are option `value`s. |
| `SwitchField` | `boolean` | Same label pattern as checkbox. |
| `RadioGroupField` | `string` | Radio options; `direction` `horizontal` \| `vertical`. |

**Shared props** (where applicable): `label`, `labelHelpText`, `description`, `disabled`. See each component’s `*Props` in `src/components/form/` for the full list.

**`TextField`**: `placeholder`, `type`, `inputProps` (native input props except `value` / `onChange` / `onBlur` / `id` / `name` / `disabled` / `aria-invalid` / `className`).

**`NumberField`**: `placeholder`, `min`, `max`, `unit`; optional **`step`** — integer delta for the chevron buttons (≥ 1). **Defaults to `1`**; omit it in most forms. Stored values use **≤ 2** decimal places.

**`SelectField`**: `placeholder`, `options`.

**`ComboboxField`**: `placeholder`, `searchPlaceholder`, `emptyText`, `options`, `allowCreate`, `createLabel`.

**`MultiselectField`**: `placeholder`, `searchPlaceholder`, `emptyText`, `options`.

**`DateField` / `DateRangeField`**: `placeholder`.

**`CheckboxField`**: `label` (beside the checkbox), optional `fieldLabel` (omit only for one standalone checkbox).

**`CheckboxGroupField`**: `label` (field label for the group), `options` (`value`, `label`), `direction` `vertical` \| `horizontal`.

**`SwitchField`**: `fieldLabel?`, `label` (text beside the switch).

**`RadioGroupField`**: `options` (`value`, `label`, optional `description`), `direction`, `onValueChange`.

### Standalone inputs (not on `useAppForm`)

These are **not** registered on the form hook. Use them for filters, toolbars, or custom layouts.

- **`SearchInput`** / **`DropdownSearchInput`** — `@/components/search-input/search-input`. Fixed search icon; `DropdownSearchInput` uses tighter horizontal padding for popovers (used internally by combobox / multiselect).
- **`Pill`** — `@/components/pill/pill`. Removable chip; used by `MultiselectField` for selected tags.

### `SubmitButton`

Submit button with loading state; uses `BaseButton` and form context.

**Props:**

- `label` (optional): Button text (default from i18n, e.g. “Submit”).
- `loadingText` (optional): Text while submitting (default from i18n).
- `variant` / `color` (optional): `BaseButton` variants.
- `buttonProps` (optional): Extra props for `BaseButton` (excluding `type`, `disabled`, `label`).

### `CancelButton`

Only renders when `onCancel` is provided.

**Props:**

- `onCancel` (optional): Callback; if omitted, the button does not render.
- `label` (optional): Button text (default from i18n).
- `variant` / `color` (optional): `Button` variants.
- `buttonProps` (optional): Extra props for `Button`.

### `DeleteButton`

Only renders when `onDelete` is provided. Typically used inside `FormButtonGroup`.

**Props:**

- `onDelete` (optional): Callback; if omitted, the button does not render.
- `label` (optional): Button text (default from i18n).
- `variant` / `color` (optional): `Button` variants.
- `buttonProps` (optional): Extra props for `Button`.

### `FormButtonGroup`

Layout: delete (left, if any), cancel + submit (right). Submit subscribes to form submit state.

**Props:**

- `onDelete`, `onCancel` (optional)
- `submitLabel`, `deleteLabel`, `cancelLabel`, `loadingText` (optional; defaults for labels from i18n / “Save”, “Delete”, “Cancel”, “Saving…”)

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
  <form.SubmitButton label="Create Account" />
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

Use `useFieldContext` together with **`FormField`** so labels, errors, and assistive text stay consistent:

```tsx
import { FormField } from "@/components/form";
import { useFieldContext } from "@/hooks/form";

export function CustomField({ label }: { label: string }) {
  const field = useFieldContext<string>();
  const hasError =
    field.state.meta.isTouched && field.state.meta.errors.length > 0;
  const errorText = hasError ? field.state.meta.errors.join(", ") : null;

  return (
    <FormField
      label={label}
      fieldId={field.name}
      error={errorText}
      isValidating={Boolean(field.state.meta.isValidating && !hasError)}
    >
      <input
        id={field.name}
        value={field.state.value ?? ""}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        aria-invalid={hasError || undefined}
      />
    </FormField>
  );
}
```

Register the component in `src/hooks/form.ts` if you want it as `field.CustomField`.

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

1. Create the component in `src/components/form/`, using **`FormField`** and (if needed) `InputShell` / `Textarea` from `@/components/ui/textarea`:

```tsx
// src/components/form/TextAreaField.tsx
import { FormField } from "@/components/form";
import { useFieldContext } from "@/hooks/form";
import { Textarea } from "@/components/ui/textarea";

export function TextAreaField({
  label,
  placeholder,
}: {
  label: string;
  placeholder?: string;
}) {
  const field = useFieldContext<string>();
  const hasError =
    field.state.meta.isTouched && field.state.meta.errors.length > 0;
  const errorText = hasError ? field.state.meta.errors.join(", ") : null;

  return (
    <FormField
      label={label}
      fieldId={field.name}
      error={errorText}
      isValidating={Boolean(field.state.meta.isValidating && !hasError)}
    >
      <Textarea
        id={field.name}
        name={field.name}
        placeholder={placeholder}
        value={field.state.value ?? ""}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        aria-invalid={hasError || undefined}
      />
    </FormField>
  );
}
```

2. Add it to `src/hooks/form.ts` in `fieldComponents` (alongside `TextField`, `DateField`, etc.):

```tsx
import { TextAreaField } from "@/components/form/TextAreaField";

export const { useAppForm, withForm } = createFormHook({
  fieldComponents: {
    TextField,
    TextAreaField, // Add here
    // ...
  },
  formComponents: {
    SubmitButton,
    // ...
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
				<form.SubmitButton label="Sign In" />
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
11. **Use `FormField` for custom controls**: Keeps label, tooltip, assistive text, and errors aligned with pre-bound fields

## Resources

- [TanStack Form Docs](https://tanstack.com/form/latest/docs/overview)
- [TanStack Form Composition Guide](https://tanstack.com/form/latest/docs/framework/react/guides/form-composition)
- [shadcn-ui Forms with TanStack Form](https://ui.shadcn.com/docs/forms/tanstack-form)
- [Zod Documentation](https://zod.dev/)
- [Standard Schema Specification](https://github.com/standard-schema/standard-schema)
