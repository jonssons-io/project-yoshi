/**
 * SubmitButton component for TanStack Form
 *
 * A submit button that automatically:
 * - Disables when form is invalid or submitting
 * - Shows loading state during submission
 * - Subscribes to form state changes efficiently
 */

import { useFormContext } from '@/hooks/form'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

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
  children = 'Submit',
  loadingText = 'Submitting...',
  variant = 'default',
  size = 'default',
  buttonProps,
}: SubmitButtonProps) {
  const form = useFormContext()

  return (
    <form.Subscribe
      selector={(state) => ({
        canSubmit: state.canSubmit,
        isSubmitting: state.isSubmitting,
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
          {isSubmitting ? loadingText : children}
        </Button>
      )}
    </form.Subscribe>
  )
}
