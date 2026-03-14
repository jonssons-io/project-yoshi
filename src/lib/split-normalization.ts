type SplitLike = {
  categoryId?: string | null
  category?: unknown
}

/**
 * The backend currently persists a single synthetic split for non-split bills.
 * In the UI, that should be treated as "not split".
 */
export function normalizeBackendSplits<T extends SplitLike>(
  splits?: T[] | null
): T[] | undefined {
  if (!splits || splits.length <= 1) return undefined
  return splits
}

/**
 * Returns the single synthetic split when the backend encoded an unsplit item
 * as a one-element splits array.
 */
export function getSyntheticSingleSplit<T extends SplitLike>(
  splits?: T[] | null
): T | undefined {
  return splits && splits.length === 1 ? splits[0] : undefined
}
