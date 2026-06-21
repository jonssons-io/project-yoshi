import { TransactionType } from '@/api/generated/types.gen'
import {
  type BudgetAllocationShortfall,
  computeBudgetAllocationShortfalls,
  type ExpenseBudgetLine,
  isEffectiveTransactionDate
} from '@/drawers/drawers/create-transaction-drawer/budget-allocation-shortfall'
import type { TransactionDraft } from './types'

type BudgetLike = {
  id: string
  name: string
  remainingAmount?: number
}

/**
 * Sums included, effective-dated expense import rows per budget.
 */
export function expenseLinesFromImportDrafts(
  drafts: TransactionDraft[]
): ExpenseBudgetLine[] {
  const lines: ExpenseBudgetLine[] = []

  for (const draft of drafts) {
    if (draft.excluded || draft.type !== TransactionType.EXPENSE) continue
    if (!draft.budgetId) continue
    if (!isEffectiveTransactionDate(new Date(draft.date))) continue

    lines.push({
      budgetId: draft.budgetId,
      amount: draft.amount
    })
  }

  return lines
}

/**
 * Budgets that would be overspent by the current import expense queue.
 */
export function computeImportBudgetShortfalls(params: {
  drafts: TransactionDraft[]
  budgets: BudgetLike[]
}): BudgetAllocationShortfall[] {
  return computeBudgetAllocationShortfalls({
    budgets: params.budgets,
    expenseLines: expenseLinesFromImportDrafts(params.drafts)
  })
}

/**
 * Income rows in the import queue that will increase the unallocated pool once saved.
 */
export function pendingIncomeTotalFromImportDrafts(
  drafts: TransactionDraft[]
): number {
  let total = 0

  for (const draft of drafts) {
    if (draft.excluded || draft.type !== TransactionType.INCOME) continue
    total += draft.amount
  }

  return total
}

/**
 * Funds the user can allocate before import: current pool plus queued incomes.
 */
export function computeImportAvailableToAllocate(params: {
  unallocatedAmount: number
  drafts: TransactionDraft[]
}): number {
  return (
    params.unallocatedAmount + pendingIncomeTotalFromImportDrafts(params.drafts)
  )
}
