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

/** Which bill split field a table column’s split-badge tooltip should describe. */
export type BillSplitTooltipField = 'subtitle' | 'category' | 'budget'

/**
 * Split-badge tooltip for one field only (e.g. category: `CatA · CatB`), matching the column.
 */
export function billSplitsTooltipSummaryByField(
  splits: BillSplit[] | undefined | null,
  field: BillSplitTooltipField,
  categoryById: Map<string, string>,
  budgetById: Map<string, string>,
  uncategorized: string
): string {
  if (!splits?.length) return ''
  return splits
    .map((s) => {
      if (field === 'subtitle') return s.subtitle?.trim() ?? ''
      if (field === 'category') {
        return billSplitCategoryDisplayName(s, categoryById, uncategorized)
      }
      return billSplitBudgetDisplayName(s, budgetById)
    })
    .join(' · ')
}

/** Full-row summary (e.g. blueprint revision diff), not for per-column table tooltips. */
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
    .map((s) =>
      transactionSplitCategoryDisplayName(s, categoryById, uncategorized)
    )
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
      const c = transactionSplitCategoryDisplayName(
        s,
        categoryById,
        uncategorized
      )
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

export type TransactionSplitTooltipField = 'subtitle' | 'category' | 'budget'

export function transactionSplitsTooltipSummaryByField(
  splits: TransactionSplit[] | undefined | null,
  field: TransactionSplitTooltipField,
  categoryById: Map<string, string>,
  budgetById: Map<string, string>,
  uncategorized: string
): string {
  if (!splits?.length) return ''
  return splits
    .map((s) => {
      if (field === 'subtitle') return s.subtitle?.trim() ?? ''
      if (field === 'category') {
        return transactionSplitCategoryDisplayName(
          s,
          categoryById,
          uncategorized
        )
      }
      return transactionSplitBudgetDisplayName(s, budgetById)
    })
    .join(' · ')
}

/** Full-row summary (non-table contexts); table cells should use {@link transactionSplitsTooltipSummaryByField}. */
export function transactionSplitsTooltipSummary(
  splits: TransactionSplit[] | undefined | null,
  categoryById: Map<string, string>,
  budgetById: Map<string, string>,
  uncategorized: string
): string {
  if (!splits?.length) return ''
  return splits
    .map((s) => {
      const c = transactionSplitCategoryDisplayName(
        s,
        categoryById,
        uncategorized
      )
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
