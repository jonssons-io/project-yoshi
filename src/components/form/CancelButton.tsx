/**
 * CancelButton component for TanStack Form
 *
 * A pre-bound cancel button for use in forms.
 * Only renders when onCancel is provided.
 */

import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

export interface CancelButtonProps {
	/**
	 * Callback when cancel is clicked
	 */
	onCancel?: () => void

	/**
	 * Button text
	 * @default "Cancel"
	 */
	children?: React.ReactNode

	/**
	 * Button variant
	 * @default "outline"
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
		'type' | 'onClick' | 'children'
	>
}

export function CancelButton({
	onCancel,
	children,
	variant = 'outline',
	size = 'default',
	buttonProps
}: CancelButtonProps) {
	const { t } = useTranslation()
	const content = children || t('common.cancel')

	if (!onCancel) {
		return null
	}

	return (
		<Button
			type="button"
			variant={variant}
			size={size}
			onClick={onCancel}
			{...buttonProps}
		>
			{content}
		</Button>
	)
}
