/**
 * FormButtonGroup component for TanStack Form
 *
 * A layout component that arranges form buttons in a consistent pattern:
 * - Delete button on the left (if provided)
 * - Cancel button followed by Submit button on the right
 *
 * This component uses the form context to render the submit button with proper state.
 */

import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useFormContext } from '@/hooks/form'
import { CancelButton, type CancelButtonProps } from './CancelButton'
import { DeleteButton, type DeleteButtonProps } from './DeleteButton'

export interface FormButtonGroupProps {
	/**
	 * Callback when delete is clicked
	 */
	onDelete?: DeleteButtonProps['onDelete']

	/**
	 * Callback when cancel is clicked
	 */
	onCancel?: CancelButtonProps['onCancel']

	/**
	 * Text for the submit button
	 * @default "Save"
	 */
	submitLabel?: string

	/**
	 * Text for the delete button
	 * @default "Delete"
	 */
	deleteLabel?: string

	/**
	 * Text for the cancel button
	 * @default "Cancel"
	 */
	cancelLabel?: string

	/**
	 * Text shown while submitting
	 * @default "Saving..."
	 */
	loadingText?: string
}

export function FormButtonGroup({
	onDelete,
	onCancel,
	submitLabel,
	deleteLabel,
	cancelLabel,
	loadingText
}: FormButtonGroupProps) {
	const { t } = useTranslation()
	const form = useFormContext()

	const effectiveSubmitLabel = submitLabel || t('common.save')
	const effectiveDeleteLabel = deleteLabel || t('common.delete')
	const effectiveCancelLabel = cancelLabel || t('common.cancel')
	const effectiveLoadingText = loadingText || t('common.loading')

	return (
		<div className="flex gap-2 justify-end">
			<DeleteButton onDelete={onDelete}>{effectiveDeleteLabel}</DeleteButton>
			<CancelButton onCancel={onCancel}>{effectiveCancelLabel}</CancelButton>
			<form.Subscribe
				selector={(state) => ({
					canSubmit: state.canSubmit,
					isSubmitting: state.isSubmitting
				})}
			>
				{({ canSubmit, isSubmitting }) => (
					<Button type="submit" disabled={!canSubmit || isSubmitting}>
						{isSubmitting && <Loader2 className="animate-spin" />}
						{isSubmitting ? effectiveLoadingText : effectiveSubmitLabel}
					</Button>
				)}
			</form.Subscribe>
		</div>
	)
}
