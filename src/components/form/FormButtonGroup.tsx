/**
 * FormButtonGroup component for TanStack Form
 *
 * A layout component that arranges form buttons in a consistent pattern:
 * - Delete button on the left (if provided)
 * - Cancel button followed by Submit button on the right
 *
 * This component uses the form context to render the submit button with proper state.
 */

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFormContext } from "@/hooks/form";
import { CancelButton, type CancelButtonProps } from "./CancelButton";
import { DeleteButton, type DeleteButtonProps } from "./DeleteButton";

export interface FormButtonGroupProps {
	/**
	 * Callback when delete is clicked
	 */
	onDelete?: DeleteButtonProps["onDelete"];

	/**
	 * Callback when cancel is clicked
	 */
	onCancel?: CancelButtonProps["onCancel"];

	/**
	 * Text for the submit button
	 * @default "Save"
	 */
	submitLabel?: string;

	/**
	 * Text for the delete button
	 * @default "Delete"
	 */
	deleteLabel?: string;

	/**
	 * Text for the cancel button
	 * @default "Cancel"
	 */
	cancelLabel?: string;

	/**
	 * Text shown while submitting
	 * @default "Saving..."
	 */
	loadingText?: string;
}

export function FormButtonGroup({
	onDelete,
	onCancel,
	submitLabel = "Save",
	deleteLabel = "Delete",
	cancelLabel = "Cancel",
	loadingText = "Saving...",
}: FormButtonGroupProps) {
	const form = useFormContext();

	return (
		<div className="flex gap-2 justify-end">
			<DeleteButton onDelete={onDelete}>{deleteLabel}</DeleteButton>
			<CancelButton onCancel={onCancel}>{cancelLabel}</CancelButton>
			<form.Subscribe
				selector={(state) => ({
					canSubmit: state.canSubmit,
					isSubmitting: state.isSubmitting,
				})}
			>
				{({ canSubmit, isSubmitting }) => (
					<Button type="submit" disabled={!canSubmit || isSubmitting}>
						{isSubmitting && <Loader2 className="animate-spin" />}
						{isSubmitting ? loadingText : submitLabel}
					</Button>
				)}
			</form.Subscribe>
		</div>
	);
}
