import { TransactionType } from '@/api/generated/types.gen'
import type { DraftBillSplit, TransactionDraft } from './types'

/**
 * A row linked to a bill takes its name, recipient, budget, and category from
 * the bill and stays that way until the user unlocks it.
 */
export function isLockedToBill(draft: TransactionDraft): boolean {
  return (
    draft.type === TransactionType.EXPENSE &&
    Boolean(draft.billInstanceId) &&
    !draft.billFieldsUnlocked
  )
}

function toCents(amount: number): number {
  return Math.round(amount * 100)
}

/**
 * Fits a bill's split lines to what was actually paid. The bank amount is the
 * truth, so when it differs from the bill each line keeps its share and the
 * rounding difference goes to the largest line.
 */
export function scaleSplitsToAmount(
  splits: DraftBillSplit[],
  amount: number
): DraftBillSplit[] {
  const total = splits.reduce((sum, split) => sum + toCents(split.amount), 0)
  const target = toCents(amount)
  if (splits.length === 0 || total === target) return splits
  if (total <= 0) {
    // Nothing to take shares from: put the whole payment on the first line.
    return splits.map((split, index) => ({
      ...split,
      amount: index === 0 ? amount : 0
    }))
  }

  const scaled = splits.map((split) =>
    Math.round((toCents(split.amount) * target) / total)
  )
  const largest = scaled.indexOf(Math.max(...scaled))
  scaled[largest] += target - scaled.reduce((sum, cents) => sum + cents, 0)

  return splits.map((split, index) => ({
    ...split,
    amount: scaled[index] / 100
  }))
}

/**
 * The split lines a row will be saved with: the linked bill's lines, fitted to
 * the row's amount, while the row follows the bill. Empty once it is unlocked
 * or unlinked, when the row's own budget and category apply instead.
 */
export function activeBillSplits(draft: TransactionDraft): DraftBillSplit[] {
  if (!isLockedToBill(draft) || !draft.billSplits?.length) return []
  return scaleSplitsToAmount(draft.billSplits, draft.amount)
}
