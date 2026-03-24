import type { TransactionType } from '@/api/generated/types.gen'
import { cn } from '@/lib/utils'

export type TransactionTypeSegmentOption = {
  value: TransactionType
  label: string
}

type TransactionTypeSegmentedControlProps = {
  value: TransactionType
  onChange: (value: TransactionType) => void
  options: TransactionTypeSegmentOption[]
}

/**
 * Full-width segmented control for transaction type (expense / income / transfer).
 * Sliding purple indicator animates between segments.
 */
export function TransactionTypeSegmentedControl({
  value,
  onChange,
  options
}: TransactionTypeSegmentedControlProps) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  )
  const segmentCount = options.length
  const widthPct = 100 / segmentCount

  return (
    <div className="relative flex w-full overflow-hidden rounded-sm border border-purple-800">
      <div
        className="absolute inset-y-0 left-0 bg-purple-800 transition-transform duration-200 ease-out"
        style={{
          width: `${widthPct}%`,
          transform: `translateX(${index * 100}%)`
        }}
        aria-hidden
      />
      {options.map((opt) => {
        const selected = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              onChange(opt.value)
            }}
            className={cn(
              'relative z-10 flex min-w-0 flex-1 items-center justify-center py-1 type-label-small-bold transition-colors',
              selected ? 'text-white' : 'text-purple-800'
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
