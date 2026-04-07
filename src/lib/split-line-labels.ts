import type { BillSplit, TransactionSplit } from '@/api/generated/types.gen'

/**
 * Display name for a bill split line category.
 * Prefers nested {@link BillSplit.category} from the API (issue #16), then legacy `categoryName`, then catalog lookup.
 */
export function billSplitCategoryDisplayName(
  s: BillSplit,
  categoryById: Map<string, string>,
  uncategorizedFallback: string
): string {
  const nested = s.category?.name?.trim()
  if (nested) return nested
  const legacy = s.categoryName?.trim()
  if (legacy) return legacy
  const cid = s.categoryId
  if (cid && categoryById.has(cid)) {
    return categoryById.get(cid) ?? uncategorizedFallback
  }
  return uncategorizedFallback
}

/**
 * Display name for a bill split line budget (nested `budget` ref preferred).
 */
export function billSplitBudgetDisplayName(
  s: BillSplit,
  budgetById: Map<string, string>
): string {
  const nested = s.budget?.name?.trim()
  if (nested) return nested
  const bid = s.budgetId ?? s.budget?.id
  if (bid && budgetById.has(bid)) {
    return budgetById.get(bid) ?? bid
  }
  return bid ?? ''
}

/** Category names only — for category column global search. */
export function billSplitsCategorySearchBlob(
  splits: BillSplit[] | undefined | null,
  categoryById: Map<string, string>,
  uncategorized: string
): string {
  if (!splits?.length) return ''
  return splits
    .map((s) => billSplitCategoryDisplayName(s, categoryById, uncategorized))
    .filter(Boolean)
    .join(' ')
}

/** Budget names only — for budget column global search. */
export function billSplitsBudgetSearchBlob(
  splits: BillSplit[] | undefined | null,
  budgetById: Map<string, string>
): string {
  if (!splits?.length) return ''
  return splits
    .map((s) => billSplitBudgetDisplayName(s, budgetById))
    .filter(Boolean)
    .join(' ')
}

/** Space-joined text for toolbar search on bill rows with split lines. */
export function billSplitsSearchBlob(
  splits: BillSplit[] | undefined | null,
  categoryById: Map<string, string>,
  budgetById: Map<string, string>,
  uncategorized: string
): string {
  if (!splits?.length) return ''
  return splits
    .map((s) => {
      const c = billSplitCategoryDisplayName(s, categoryById, uncategorized)
      const b = billSplitBudgetDisplayName(s, budgetById)
      const sub = s.subtitle?.trim() ?? ''
      return [
        sub,
        c,
        b
      ]
        .filter(Boolean)
        .join(' ')
    })
    .filter(Boolean)
    .join(' ')
}

/** Short summary for `title` on split badges (e.g. `Sub · Cat · Budget | …`). */
export function billSplitsTooltipSummary(
  splits: BillSplit[] | undefined | null,
  categoryById: Map<string, string>,
  budgetById: Map<string, string>,
  uncategorized: string
): string {
  if (!splits?.length) return ''
  return splits
    .map((s) => {
      const c = billSplitCategoryDisplayName(s, categoryById, uncategorized)
      const b = billSplitBudgetDisplayName(s, budgetById)
      const sub = s.subtitle?.trim() ?? ''
      return [
        sub,
        c,
        b
      ]
        .filter(Boolean)
        .join(' · ')
    })
    .filter(Boolean)
    .join(' | ')
}

export function transactionSplitCategoryDisplayName(
  s: TransactionSplit,
  categoryById: Map<string, string>,
  uncategorizedFallback: string
): string {
  const nested = s.category?.name?.trim()
  if (nested) return nested
  const cid = s.categoryId
  if (cid && categoryById.has(cid)) {
    return categoryById.get(cid) ?? uncategorizedFallback
  }
  return uncategorizedFallback
}

export function transactionSplitBudgetDisplayName(
  s: TransactionSplit,
  budgetById: Map<string, string>
): string {
  const nested = s.budget?.name?.trim()
  if (nested) return nested
  const bid = s.budgetId ?? s.budget?.id
  if (bid && budgetById.has(bid)) {
    return budgetById.get(bid) ?? bid
  }
  return bid ?? ''
}

export function transactionSplitsCategorySearchBlob(
  splits: TransactionSplit[] | undefined | null,
  categoryById: Map<string, string>,
  uncategorized: string
): string {
  if (!splits?.length) return ''
  return splits
    .map((s) => transactionSplitCategoryDisplayName(s, categoryById, uncategorized))
    .filter(Boolean)
    .join(' ')
}

export function transactionSplitsBudgetSearchBlob(
  splits: TransactionSplit[] | undefined | null,
  budgetById: Map<string, string>
): string {
  if (!splits?.length) return ''
  return splits
    .map((s) => transactionSplitBudgetDisplayName(s, budgetById))
    .filter(Boolean)
    .join(' ')
}

export function transactionSplitsSearchBlob(
  splits: TransactionSplit[] | undefined | null,
  categoryById: Map<string, string>,
  budgetById: Map<string, string>,
  uncategorized: string
): string {
  if (!splits?.length) return ''
  return splits
    .map((s) => {
      const c = transactionSplitCategoryDisplayName(s, categoryById, uncategorized)
      const b = transactionSplitBudgetDisplayName(s, budgetById)
      const sub = s.subtitle?.trim() ?? ''
      return [
        sub,
        c,
        b
      ]
        .filter(Boolean)
        .join(' ')
    })
    .filter(Boolean)
    .join(' ')
}

export function transactionSplitsTooltipSummary(
  splits: TransactionSplit[] | undefined | null,
  categoryById: Map<string, string>,
  budgetById: Map<string, string>,
  uncategorized: string
): string {
  if (!splits?.length) return ''
  return splits
    .map((s) => {
      const c = transactionSplitCategoryDisplayName(s, categoryById, uncategorized)
      const b = transactionSplitBudgetDisplayName(s, budgetById)
      const sub = s.subtitle?.trim() ?? ''
      return [
        sub,
        c,
        b
      ]
        .filter(Boolean)
        .join(' · ')
    })
    .filter(Boolean)
    .join(' | ')
}
