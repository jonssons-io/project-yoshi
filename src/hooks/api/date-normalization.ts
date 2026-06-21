export type ApiDateInput = string | Date
export type OptionalApiDateInput = ApiDateInput | null | undefined

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * API date-time fields reject plain `YYYY-MM-DD` strings. Calendar dates from
 * imports and `<input type="date">` are normalized to UTC midnight ISO strings.
 */
function normalizeApiDateString(value: string): string {
  if (DATE_ONLY_PATTERN.test(value)) {
    return `${value}T00:00:00.000Z`
  }
  return value
}

export function toApiDate(value: OptionalApiDateInput): string | undefined {
  if (value == null) return undefined
  if (value instanceof Date) return value.toISOString()
  return normalizeApiDateString(value)
}

export function toApiDateRequired(value: ApiDateInput): string {
  if (value instanceof Date) return value.toISOString()
  return normalizeApiDateString(value)
}

export function fromApiDate(value: string): Date {
  return new Date(value)
}

export function fromOptionalApiDate(
  value: string | undefined
): Date | undefined {
  if (!value) return undefined
  return new Date(value)
}
