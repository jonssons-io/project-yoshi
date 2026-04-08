import { XIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import {
  INPUT_ICON_STROKE,
  inputIconClassName
} from '@/components/input-shell/input-shell'
import { cn } from '@/lib/utils'

export type PillProps = {
  children: ReactNode
  onRemove?: () => void
  removeLabel?: string
  decorativeRemove?: boolean
}

/**
 * Removable chip for multiselect and similar UIs.
 */
export function Pill({
  children,
  onRemove,
  removeLabel,
  decorativeRemove = false
}: PillProps) {
  return (
    <span
      data-slot="pill"
      className="inline-flex max-w-full items-center gap-1 rounded-sm border border-gray-300 bg-gray-100 py-0.5 pr-1 pl-2 type-label text-gray-800"
    >
      <span className="min-w-0 truncate">{children}</span>
      {onRemove && decorativeRemove ? (
        <span
          aria-hidden={true}
          className={cn(inputIconClassName, 'text-gray-500')}
        >
          <XIcon
            strokeWidth={INPUT_ICON_STROKE}
            aria-hidden
          />
        </span>
      ) : null}
      {onRemove && !decorativeRemove ? (
        <button
          type="button"
          className={cn(
            inputIconClassName,
            'text-gray-500 hover:text-gray-800'
          )}
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          aria-label={removeLabel ?? 'Remove'}
        >
          <XIcon
            strokeWidth={INPUT_ICON_STROKE}
            aria-hidden
          />
        </button>
      ) : null}
    </span>
  )
}
