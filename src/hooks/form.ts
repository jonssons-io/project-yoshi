/**
 * Custom TanStack Form hooks and components for the application
 *
 * This module provides:
 * - useAppForm: A custom hook for creating forms with pre-configured components
 * - withForm: A utility for creating reusable form components
 * - TextField: A pre-bound text field component with validation support
 * - SubmitButton: A pre-bound submit button with loading states
 *
 * Usage:
 * ```tsx
 * const form = useAppForm({
 *   defaultValues: { name: '' },
 *   onSubmit: async ({ value }) => { console.log(value) }
 * })
 *
 * return (
 *   <form onSubmit={...}>
 *     <form.AppField name="name">
 *       {(field) => <field.TextField label="Name" />}
 *     </form.AppField>
 *     <form.AppForm>
 *       <form.SubmitButton />
 *     </form.AppForm>
 *   </form>
 * )
 * ```
 */

import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
import { CancelButton } from "@/components/form/CancelButton";
import { ComboboxField } from "@/components/form/ComboboxField";
import { DateField } from "@/components/form/DateField";
import { DeleteButton } from "@/components/form/DeleteButton";
import { FormButtonGroup } from "@/components/form/FormButtonGroup";
import { NumberField } from "@/components/form/NumberField";
import { RadioGroupField } from "@/components/form/RadioGroupField";
import { SelectField } from "@/components/form/SelectField";
import { SubmitButton } from "@/components/form/SubmitButton";
import { TextField } from "@/components/form/TextField";

// Create contexts for field and form components to access form state
const { fieldContext, useFieldContext, formContext, useFormContext } =
	createFormHookContexts();

// Export contexts for use in custom components
export { useFieldContext, useFormContext };

// Create the custom form hook with pre-bound components
export const { useAppForm, withForm } = createFormHook({
	fieldComponents: {
		TextField,
		DateField,
		SelectField,
		NumberField,
		ComboboxField,
		RadioGroupField,
	},
	formComponents: {
		SubmitButton,
		CancelButton,
		DeleteButton,
		FormButtonGroup,
	},
	fieldContext,
	formContext,
});
