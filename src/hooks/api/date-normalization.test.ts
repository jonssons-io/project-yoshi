import { describe, expect, it } from 'vitest'
import { toApiDate, toApiDateRequired } from './date-normalization'

describe('date-normalization', () => {
  it('normalizes date-only strings to UTC midnight ISO datetimes', () => {
    expect(toApiDateRequired('2026-06-20')).toBe('2026-06-20T00:00:00.000Z')
    expect(toApiDate('2026-06-20')).toBe('2026-06-20T00:00:00.000Z')
  })

  it('passes through full ISO datetimes unchanged', () => {
    const iso = '2026-06-20T14:30:00.000Z'
    expect(toApiDateRequired(iso)).toBe(iso)
  })

  it('serializes Date values with toISOString', () => {
    expect(
      toApiDateRequired(new Date(Date.UTC(2026, 5, 20, 14, 30, 0)))
    ).toBe('2026-06-20T14:30:00.000Z')
  })
})
