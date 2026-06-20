import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

const backgroundByColor = {
  gray: 'bg-gray-100',
  green: 'bg-green-100 dark:bg-green-900',
  red: 'bg-red-100 dark:bg-red-900',
  blue: 'bg-blue-100 dark:bg-blue-900'
} as const

const iconColorByColor = {
  gray: 'text-gray-800',
  green: 'text-green-600 dark:text-green-400',
  red: 'text-red-600 dark:text-red-400',
  blue: 'text-blue-600 dark:text-blue-400'
} as const

export type InfoCardColor = keyof typeof backgroundByColor

export type InfoCardProps = {
  color: InfoCardColor
  /** 1×1rem icon (e.g. Lucide), tinted by `color` */
  icon: ReactNode
  label: string
  value: ReactNode
}

/**
 * Compact summary card for the page header (icon + label row, prominent value).
 */
export function InfoCard({ color, icon, label, value }: InfoCardProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-4 rounded-lg p-4 ring-1 ring-black/5 dark:ring-white/10',
        backgroundByColor[color]
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            'inline-flex size-4 shrink-0 items-center justify-center [&_svg]:size-4',
            iconColorByColor[color]
          )}
          aria-hidden={true}
        >
          {icon}
        </span>
        <span className="type-label text-muted-foreground dark:text-white/80">
          {label}
        </span>
      </div>
      <div className="type-title-sans-large-medium text-foreground dark:text-white">
        {value}
      </div>
    </div>
  )
}
