import { cva } from 'class-variance-authority'
import * as React from 'react'
import { ShadcnButton, type ShadcnButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type ButtonVariant = 'filled' | 'outlined' | 'text'
export type ButtonColor = 'primary' | 'destructive' | 'subtle'

export const baseButtonVariants = cva(
  'type-button inline-flex items-center justify-center whitespace-nowrap rounded-[0.25rem] border border-transparent bg-transparent text-center transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:border-red-500 aria-invalid:ring-red-500/30 cursor-pointer',
  {
    variants: {
      variant: {
        filled: '',
        outlined: '',
        text: ''
      },
      color: {
        primary: '',
        destructive: '',
        subtle: ''
      },
      iconOnly: {
        false: 'gap-2 px-4 py-2',
        true: 'gap-0 p-1'
      }
    },
    compoundVariants: [
      {
        variant: 'filled',
        color: 'primary',
        className: 'bg-purple-800 text-white hover:bg-purple-800/90'
      },
      {
        variant: 'outlined',
        color: 'primary',
        className: 'border-purple-800 text-purple-800 hover:bg-purple-800/5'
      },
      {
        variant: 'text',
        color: 'primary',
        className: 'text-purple-800 hover:bg-purple-800/5'
      },
      {
        variant: 'filled',
        color: 'destructive',
        className: 'bg-red-500 text-white hover:bg-red-500/90'
      },
      {
        variant: 'outlined',
        color: 'destructive',
        className: 'border-red-500 text-red-500 hover:bg-red-100'
      },
      {
        variant: 'text',
        color: 'destructive',
        className: 'text-red-500 hover:bg-red-100'
      },
      {
        variant: 'filled',
        color: 'subtle',
        className: 'bg-gray-800 text-white hover:bg-gray-800/90'
      },
      {
        variant: 'outlined',
        color: 'subtle',
        className: 'border-gray-800 text-gray-800 hover:bg-gray-100'
      },
      {
        variant: 'text',
        color: 'subtle',
        className: 'text-gray-800 hover:bg-gray-100'
      }
    ],
    defaultVariants: {
      variant: 'filled',
      color: 'primary',
      iconOnly: false
    }
  }
)

export type BaseButtonProps = Omit<ShadcnButtonProps, 'children' | 'color'> & {
  children: React.ReactNode
  variant?: ButtonVariant
  color?: ButtonColor
  iconOnly?: boolean
}

/**
 * Shared button foundation used by strict `Button` and `IconButton` wrappers.
 * `className` is intended for layered `ui/` composition (for example calendar cells), not ad-hoc styling — prefer `Button` / `IconButton` or a local wrapper in feature code.
 */
export const BaseButton = React.forwardRef<HTMLButtonElement, BaseButtonProps>(
  (
    {
      children,
      className,
      variant = 'filled',
      color = 'primary',
      iconOnly = false,
      ...props
    },
    ref
  ) => {
    return (
      <ShadcnButton
        ref={ref}
        data-variant={variant}
        data-color={color}
        data-icon-only={iconOnly}
        className={cn(
          baseButtonVariants({
            variant,
            color,
            iconOnly
          }),
          className
        )}
        {...props}
      >
        {children}
      </ShadcnButton>
    )
  }
)

BaseButton.displayName = 'BaseButton'
