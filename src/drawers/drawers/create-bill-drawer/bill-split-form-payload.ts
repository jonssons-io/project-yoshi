import type { BillSplitRowValue } from './types'

/**
 * When the bill uses split lines, the UI derives the total from splits. The top-level
 * `amount` field may stay `null` until effects run, or stay stale — but Zod / submit
 * validation must not treat that as “missing amount”. Coerce `amount` to the sum of
 * split line amounts when every line has a finite amount; otherwise leave values as-is
 * so per-split validation can report the real issue.
 */
export function withSplitTotalsCoercedForValidation<
  T extends {
    splits?: BillSplitRowValue[]
    amount?: number | null
  }
>(value: T): T {
  const splits = value.splits
  if (splits == null || splits.length === 0) {
    return value
  }

  let sum = 0
  for (const row of splits) {
    const a = row.amount
    if (a == null || !Number.isFinite(a)) {
      return {
        ...value,
        splits
      }
    }
    sum += a
  }

  const total = Number(sum.toFixed(2))
  return {
    ...value,
    splits,
    amount: total
  }
}
