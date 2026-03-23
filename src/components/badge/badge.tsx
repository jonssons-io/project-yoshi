import { cn } from '@/lib/utils'

export type BadgeColor =
  | 'blue'
  | 'gray'
  | 'green'
  | 'lilac'
  | 'lime'
  | 'orange'
  | 'pink'
  | 'red'
  | 'teal'
  | 'yellow'

const BADGE_COLOR_CLASS: Record<BadgeColor, string> = {
  blue: 'bg-blue-100 text-blue-600',
  gray: 'bg-gray-100 text-gray-800',
  green: 'bg-green-100 text-green-500',
  lilac: 'bg-lilac-100 text-lilac-600',
  lime: 'bg-lime-100 text-lime-600',
  orange: 'bg-orange-100 text-orange-600',
  pink: 'bg-pink-100 text-pink-600',
  red: 'bg-red-100 text-red-700',
  teal: 'bg-teal-100 text-teal-600',
  yellow: 'bg-yellow-100 text-yellow-600'
}

export type BadgeProps = {
  color: BadgeColor
  label: string
}

/**
 * Static, non-interactive label with a tinted background (not a chip / not removable).
 */
export function Badge({ color, label }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(
        'inline-flex items-center rounded-sm px-1 py-0.5 type-label-small',
        BADGE_COLOR_CLASS[color]
      )}
    >
      {label}
    </span>
  )
}
