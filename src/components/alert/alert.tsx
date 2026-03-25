import { BadgeAlert, BadgeCheck, BadgeInfo } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

const backgroundByVariant = {
  success: 'bg-green-100',
  info: 'bg-blue-100',
  error: 'bg-red-100',
  discrete: 'bg-gray-100'
} as const

const iconColorByVariant = {
  success: 'text-green-500',
  info: 'text-blue-600',
  error: 'text-red-500',
  discrete: 'text-gray-800'
} as const

export type AlertVariant = keyof typeof backgroundByVariant

const iconByVariant = {
  success: BadgeCheck,
  info: BadgeInfo,
  error: BadgeAlert,
  discrete: BadgeInfo
} as const

export type AlertProps = {
  variant: AlertVariant
  children: ReactNode
}

/**
 * Inline alert banner: tinted background, colored icon, black text.
 * Background and icon colors match `InfoCard`.
 */
export function Alert({ variant, children }: AlertProps) {
  const Icon = iconByVariant[variant]

  return (
    <div
      className={cn(
        'flex flex-row items-start gap-2 px-4 py-2',
        backgroundByVariant[variant]
      )}
    >
      <span
        className={cn(
          'inline-flex size-4 shrink-0 items-center justify-center [&_svg]:size-4',
          iconColorByVariant[variant]
        )}
        aria-hidden={true}
      >
        <Icon />
      </span>
      <span className="min-w-0 text-black type-label-small">{children}</span>
    </div>
  )
}
