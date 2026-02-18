/**
 * SubmitButton component for TanStack Form
 *
 * A submit button that automatically:
 * - Disables when form is invalid or submitting
 * - Shows loading state during submission
 * - Subscribes to form state changes efficiently
 */

import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useFormContext } from '@/hooks/form'

export interface SubmitButtonProps {
	/**
	 * Button text
	 * @default "Submit"
	 */
	children?: React.ReactNode

	/**
	 * Text to show when submitting
	 * @default "Submitting..."
	 */
	loadingText?: string

	/**
	 * Button variant
	 * @default "default"
	 */
	variant?: React.ComponentProps<typeof Button>['variant']

	/**
	 * Button size
	 * @default "default"
	 */
	size?: React.ComponentProps<typeof Button>['size']

	/**
	 * Additional props to pass to the Button component
	 */
	buttonProps?: Omit<
		React.ComponentProps<typeof Button>,
		'type' | 'disabled' | 'children'
	>
}

export function SubmitButton({
	children,
	loadingText,
	variant = 'default',
	size = 'default',
	buttonProps
}: SubmitButtonProps) {
	const { t } = useTranslation()
	const form = useFormContext()

	const effectiveChildren = children ?? t('common.submit')
	const effectiveLoadingText = loadingText ?? t('common.submitting')

	return (
		<form.Subscribe
			selector={(state) => ({
				canSubmit: state.canSubmit,
				isSubmitting: state.isSubmitting
			})}
		>
			{({ canSubmit, isSubmitting }) => (
				<Button
					type="submit"
					disabled={!canSubmit || isSubmitting}
					variant={variant}
					size={size}
					{...buttonProps}
				>
					{isSubmitting && <Loader2 className="animate-spin" />}
					{isSubmitting ? effectiveLoadingText : effectiveChildren}
				</Button>
			)}
		</form.Subscribe>
	)
}
