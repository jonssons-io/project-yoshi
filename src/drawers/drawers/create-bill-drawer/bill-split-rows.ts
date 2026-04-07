import type { BillSplit } from '@/api/generated/types.gen'

import type { BillSplitRowValue } from './types'

export type MapBillSplitsToFormRowsOptions = {
  /**
   * When the API omits per-line `budgetId` (inherited from the instance/blueprint),
   * the split UI still needs a budget so `useCategoriesList` runs and the category combobox can resolve labels.
   */
  defaultBudgetId?: string | null
}

function firstNonEmptyString(
  ...candidates: Array<string | null | undefined>
): string {
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length > 0) {
      return c.trim()
    }
  }
  return ''
}

/**
 * Maps API {@link BillSplit} lines to form rows (create/edit bill drawers).
 * Resolves category id from nested `category` when `categoryId` is empty; applies {@link MapBillSplitsToFormRowsOptions.defaultBudgetId}
 * when the line has no budget of its own.
 */
export function mapBillSplitsToFormRows(
  splits: BillSplit[],
  options?: MapBillSplitsToFormRowsOptions
): BillSplitRowValue[] {
  const defaultBudget = firstNonEmptyString(options?.defaultBudgetId)
  return splits.map((s) => {
    const budgetId = firstNonEmptyString(
      s.budgetId,
      s.budget?.id,
      defaultBudget
    )
    const categoryId = firstNonEmptyString(s.categoryId, s.category?.id)
    const prefillCategoryName = firstNonEmptyString(
      s.category?.name,
      s.categoryName
    )

    return {
      id: s.id,
      subtitle: s.subtitle ?? '',
      amount: s.amount,
      budgetId,
      category: categoryId.length > 0 ? categoryId : null,
      ...(prefillCategoryName.length > 0
        ? {
            prefillCategoryName
          }
        : {})
    }
  })
}
