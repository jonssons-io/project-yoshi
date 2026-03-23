import * as React from 'react'
import {
  BaseButton,
  type ButtonColor,
  type ButtonVariant
} from '@/components/base-button/base-button'

export interface ButtonProps {
  variant?: ButtonVariant
  color?: ButtonColor
  label: React.ReactNode
  icon?: React.ReactNode
  onClick: React.MouseEventHandler<HTMLButtonElement>
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

/**
 * Standard text button with an optional leading icon.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'filled',
      color = 'primary',
      label,
      icon,
      onClick,
      disabled,
      type
    },
    ref
  ) => {
    return (
      <BaseButton
        ref={ref}
        variant={variant}
        color={color}
        iconOnly={false}
        onClick={onClick}
        disabled={disabled}
        type={type}
      >
        {icon}
        <span>{label}</span>
      </BaseButton>
    )
  }
)

Button.displayName = 'Button'
