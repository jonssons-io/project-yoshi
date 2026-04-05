import type { BadgeColor } from '@/components/badge/badge'

const BUDGET_BADGE_PALETTE = [
  'blue',
  'pink',
  'orange',
  'teal',
  'lilac',
  'yellow',
  'lime',
  'gray'
] as const satisfies readonly BadgeColor[]

const CATEGORY_BADGE_PALETTE = [
  'blue',
  'pink',
  'orange',
  'teal',
  'lilac',
  'yellow',
  'lime'
] as const satisfies readonly BadgeColor[]

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

export function budgetBadgeColor(budgetId: string): BadgeColor {
  const palette = BUDGET_BADGE_PALETTE
  const idx = hashString(budgetId) % palette.length
  return (palette[idx] ?? 'blue') as BadgeColor
}

export function categoryBadgeColor(categoryId: string): BadgeColor {
  const palette = CATEGORY_BADGE_PALETTE
  const idx = hashString(categoryId) % palette.length
  return (palette[idx] ?? 'blue') as BadgeColor
}
