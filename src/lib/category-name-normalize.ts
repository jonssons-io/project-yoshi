import type {
  BillSplitWrite,
  TransactionSplitWrite
} from '@/api/generated/types.gen'

const TITLE_LOCALE = 'sv-SE'

function titleCaseSegment(segment: string): string {
  if (!segment) return segment
  const first = segment.charAt(0).toLocaleUpperCase(TITLE_LOCALE)
  const rest = segment.slice(1).toLocaleLowerCase(TITLE_LOCALE)
  return first + rest
}

/**
 * Title-cases a category name for persistence (whitespace-separated words;
 * hyphenated parts are cased per segment, e.g. `snabb-mat` → `Snabb-Mat`).
 */
export function titleCaseCategoryName(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  return trimmed
    .split(/\s+/u)
    .map((word) =>
      word
        .split('-')
        .map((part) => titleCaseSegment(part))
        .join('-')
    )
    .join(' ')
}

function normalizeOptionalCategoryName(
  value: string | undefined
): string | undefined {
  if (value === undefined) return undefined
  const t = value.trim()
  if (!t) return ''
  return titleCaseCategoryName(value)
}

export function normalizeTransactionSplitWrite(
  split: TransactionSplitWrite
): TransactionSplitWrite {
  return {
    ...split,
    newCategoryName: normalizeOptionalCategoryName(split.newCategoryName),
    newCategory: split.newCategory
      ? {
          ...split.newCategory,
          name: titleCaseCategoryName(split.newCategory.name)
        }
      : split.newCategory
  }
}

type TransactionBodyWithInlineCategory = {
  newCategory?: {
    name: string
  }
  splits?: TransactionSplitWrite[]
}

/**
 * Applies {@link titleCaseCategoryName} to inline category fields on transaction create/update bodies.
 */
export function withTitleCasedCategoryFieldsForTransactionBody<
  T extends TransactionBodyWithInlineCategory
>(body: T): T {
  const next: T = {
    ...body
  }
  if (next.newCategory) {
    next.newCategory = {
      ...next.newCategory,
      name: titleCaseCategoryName(next.newCategory.name)
    }
  }
  if (next.splits?.length) {
    next.splits = next.splits.map(normalizeTransactionSplitWrite)
  }
  return next
}

type BillBodyWithInlineCategory = {
  newCategoryName?: string
  splits?: BillSplitWrite[]
}

/**
 * Applies {@link titleCaseCategoryName} to inline category fields on bill create/update bodies.
 */
export function withTitleCasedCategoryFieldsForBillBody<
  T extends BillBodyWithInlineCategory
>(body: T): T {
  const next: T = {
    ...body
  }
  if (typeof next.newCategoryName === 'string') {
    const normalized = normalizeOptionalCategoryName(next.newCategoryName)
    if (normalized !== undefined) {
      next.newCategoryName = normalized
    }
  }
  if (next.splits?.length) {
    next.splits = next.splits.map((s) => ({
      ...s,
      newCategoryName: normalizeOptionalCategoryName(s.newCategoryName)
    }))
  }
  return next
}

type IncomeBodyWithNewCategory = {
  newCategoryName?: string
}

/**
 * Applies {@link titleCaseCategoryName} to `newCategoryName` on income create/update bodies.
 */
export function withTitleCasedNewCategoryNameForIncomeBody<
  T extends IncomeBodyWithNewCategory
>(body: T): T {
  if (typeof body.newCategoryName !== 'string') {
    return body
  }
  const normalized = normalizeOptionalCategoryName(body.newCategoryName)
  if (normalized === undefined) {
    return body
  }
  return {
    ...body,
    newCategoryName: normalized
  }
}
