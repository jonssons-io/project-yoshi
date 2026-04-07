import type { TFunction } from 'i18next'
import { Layers } from 'lucide-react'
import type { ReactNode } from 'react'

import { Badge } from '@/components/badge/badge'

/** Plain text for toolbar global search when a row uses split lines. */
export function splitLinesToolbarSearchText(
  lineCount: number,
  t: TFunction
): string {
  return lineCount > 0 ? `${lineCount} ${t('common.splits')}` : ''
}

/** Stable string for column sorting: split rows sort under a `splits-{n}` key, else the fallback label. */
export function splitLinesSortKey(
  lineCount: number,
  nameFallback: string
): string {
  return lineCount > 0 ? `splits-${lineCount}` : nameFallback.toLowerCase()
}

type SplitLinesTableCellProps = {
  lineCount: number
  t: TFunction
  /** Native tooltip: per-line subtitle · category · budget when API embeds split refs. */
  title?: string
}

/**
 * Layers icon + gray badge (`N` + splits label). Only render when `lineCount` is positive.
 */
export function SplitLinesTableCell({
  lineCount,
  t,
  title
}: SplitLinesTableCellProps): ReactNode {
  if (lineCount <= 0) return null
  return (
    <span
      className="inline-flex items-center gap-1"
      title={title && title.length > 0 ? title : undefined}
    >
      <Layers
        className="size-4 shrink-0 text-gray-600"
        strokeWidth={1.5}
        aria-hidden={true}
      />
      <Badge
        color="gray"
        label={`${lineCount} ${t('common.splits')}`}
      />
    </span>
  )
}
