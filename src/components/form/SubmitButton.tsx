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
import { BaseButton } from '@/components/base-button/base-button'
import { useFormContext } from '@/hooks/form'

export interface SubmitButtonProps {
  /**
   * Button text
   * @default "Submit"
   */
  label?: React.ReactNode

  /**
   * Text to show when submitting
   * @default "Submitting..."
   */
  loadingText?: string

  /**
   * Button variant
   * @default "filled"
   */
  variant?: React.ComponentProps<typeof BaseButton>['variant']

  /**
   * Button color
   * @default "primary"
   */
  color?: React.ComponentProps<typeof BaseButton>['color']

  /**
   * Additional props to pass to the BaseButton component
   */
  buttonProps?: Omit<
    React.ComponentProps<typeof BaseButton>,
    'type' | 'disabled' | 'label'
  >
}

export function SubmitButton({
  label,
  loadingText,
  variant = 'filled',
  color = 'primary',
  buttonProps
}: SubmitButtonProps) {
  const { t } = useTranslation()
  const form = useFormContext()

  const effectiveLabel = label ?? t('common.submit')
  const effectiveLoadingText = loadingText ?? t('common.submitting')

  return (
    <form.Subscribe
      selector={(state) => ({
        canSubmit: state.canSubmit,
        isSubmitting: state.isSubmitting
      })}
    >
      {({ canSubmit, isSubmitting }) => (
        <BaseButton
          type="submit"
          disabled={!canSubmit || isSubmitting}
          variant={variant}
          color={color}
          className="gap-2"
          {...buttonProps}
        >
          {isSubmitting ? <Loader2 className="animate-spin" /> : null}
          <span>{isSubmitting ? effectiveLoadingText : effectiveLabel}</span>
        </BaseButton>
      )}
    </form.Subscribe>
  )
}
