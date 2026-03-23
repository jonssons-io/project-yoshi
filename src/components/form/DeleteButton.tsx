/**
 * DeleteButton component for TanStack Form
 *
 * A pre-bound destructive button for delete actions in forms.
 * Only renders when onDelete is provided.
 */

import { useTranslation } from 'react-i18next'
import { Button } from '@/components/button/button'

export interface DeleteButtonProps {
  /**
   * Callback when delete is clicked
   */
  onDelete?: () => void

  /**
   * Button text
   * @default "Delete"
   */
  label?: React.ReactNode

  /**
   * Button variant
   * @default "filled"
   */
  variant?: React.ComponentProps<typeof Button>['variant']

  /**
   * Button color
   * @default "destructive"
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

export function DeleteButton({
  onDelete,
  label,
  variant = 'filled',
  color = 'destructive',
  buttonProps
}: DeleteButtonProps) {
  const { t } = useTranslation()
  const content = label || t('common.delete')

  if (!onDelete) {
    return null
  }

  return (
    <div className="mr-auto">
      <Button
        type="button"
        variant={variant}
        color={color}
        label={content}
        onClick={onDelete}
        {...buttonProps}
      />
    </div>
  )
}
