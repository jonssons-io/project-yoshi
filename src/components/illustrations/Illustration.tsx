import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import PanaNoAccount from './PanaNoAccount'
import PanaNoBills from './PanaNoBills'
import PanaNoBudget from './PanaNoBudget'
import PanaNoCategory from './PanaNoCategory'
import PanaNoHousehold from './PanaNoHousehold'
import PanaNoIncome from './PanaNoIncome'
import PanaNoTransactions from './PanaNoTransactions'

const ILLUSTRATION_COMPONENTS = {
  'pana-no-household': PanaNoHousehold,
  'pana-no-budget': PanaNoBudget,
  'pana-no-account': PanaNoAccount,
  'pana-no-category': PanaNoCategory,
  'pana-no-income': PanaNoIncome,
  'pana-no-bills': PanaNoBills,
  'pana-no-transactions': PanaNoTransactions
} as const

export type IllustrationVariant = keyof typeof ILLUSTRATION_COMPONENTS

type IllustrationProps = Omit<ComponentProps<'div'>, 'children'> & {
  variant: IllustrationVariant
}

/**
 * Renders an illustration by variant and always fills its parent.
 */
export function Illustration({
  variant,
  className,
  ...props
}: IllustrationProps) {
  const SelectedIllustration = ILLUSTRATION_COMPONENTS[variant]

  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center rounded-[2rem] p-3',
        'dark:bg-muted/35 dark:ring-1 dark:ring-border/55',
        '[&_svg]:h-full [&_svg]:w-full [&_svg]:max-h-full',
        'dark:[&_svg]:brightness-[1.07] dark:[&_svg]:contrast-[1.04]',
        className
      )}
      {...props}
    >
      <SelectedIllustration className="h-full w-full min-h-0 min-w-0" />
    </div>
  )
}
