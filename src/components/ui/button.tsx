import { Slot } from '@radix-ui/react-slot'
import { type ComponentPropsWithoutRef, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export type ShadcnButtonProps = ComponentPropsWithoutRef<'button'> & {
  asChild?: boolean
}

/**
 * Minimal shadcn-style button primitive.
 */
export const ShadcnButton = forwardRef<HTMLButtonElement, ShadcnButtonProps>(
  ({ asChild = false, className, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'

    return (
      <Comp
        ref={ref}
        data-slot="button"
        className={cn(className)}
        {...props}
      />
    )
  }
)

ShadcnButton.displayName = 'ShadcnButton'
