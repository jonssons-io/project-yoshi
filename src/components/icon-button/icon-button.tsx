import * as React from 'react'
import {
  BaseButton,
  type ButtonColor,
  type ButtonVariant
} from '@/components/base-button/base-button'

export interface IconButtonProps {
  variant?: ButtonVariant
  color?: ButtonColor
  icon: React.ReactNode
  onClick: React.MouseEventHandler<HTMLButtonElement>
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  title?: string
  'aria-label'?: string
}

/**
 * Icon-only button with compact padding.
 */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      variant = 'filled',
      color = 'primary',
      icon,
      onClick,
      disabled,
      type,
      title,
      'aria-label': ariaLabel
    },
    ref
  ) => {
    return (
      <BaseButton
        ref={ref}
        variant={variant}
        color={color}
        iconOnly
        onClick={onClick}
        disabled={disabled}
        type={type}
        title={title}
        aria-label={ariaLabel}
      >
        {icon}
      </BaseButton>
    )
  }
)

IconButton.displayName = 'IconButton'
