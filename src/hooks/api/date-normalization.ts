export type ApiDateInput = string | Date
export type OptionalApiDateInput = ApiDateInput | null | undefined

export function toApiDate(value: OptionalApiDateInput): string | undefined {
  if (value == null) return undefined
  return value instanceof Date ? value.toISOString() : value
}

export function toApiDateRequired(value: ApiDateInput): string {
  return value instanceof Date ? value.toISOString() : value
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
