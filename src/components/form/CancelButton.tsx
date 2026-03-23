/**
 * CancelButton component for TanStack Form
 *
 * A pre-bound cancel button for use in forms.
 * Only renders when onCancel is provided.
 */

import { useTranslation } from 'react-i18next'
import { Button } from '@/components/button/button'

export interface CancelButtonProps {
  /**
   * Callback when cancel is clicked
   */
  onCancel?: () => void

  /**
   * Button text
   * @default "Cancel"
   */
  label?: React.ReactNode

  /**
   * Button variant
   * @default "outlined"
   */
  variant?: React.ComponentProps<typeof Button>['variant']

  /**
   * Button color
   * @default "subtle"
   */
  color?: React.ComponentProps<typeof Button>['color']

  /**
   * Additional props to pass to the Button component
   */
  buttonProps?: Omit<
    React.ComponentProps<typeof Button>,
    'type' | 'onClick' | 'label'
  >
}

export function CancelButton({
  onCancel,
  label,
  variant = 'outlined',
  color = 'subtle',
  buttonProps
}: CancelButtonProps) {
  const { t } = useTranslation()
  const content = label || t('common.cancel')

  if (!onCancel) {
    return null
  }

  return (
    <Button
      type="button"
      variant={variant}
      color={color}
      label={content}
      onClick={onCancel}
      {...buttonProps}
    />
  )
}
