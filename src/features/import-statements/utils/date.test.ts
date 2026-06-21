import { describe, expect, it } from 'vitest'
import { parseStatementDate } from './date'

describe('parseStatementDate', () => {
  it.each([
    [
      '2026-06-20',
      '2026-06-20'
    ],
    [
      '2026/06/20',
      '2026-06-20'
    ],
    [
      '20/06/2026',
      '2026-06-20'
    ],
    [
      '20.06.2026',
      '2026-06-20'
    ],
    [
      new Date(Date.UTC(2026, 5, 20)),
      '2026-06-20'
    ],
    [
      46193,
      '2026-06-20'
    ]
  ])('parses %s', (input, expected) => {
    expect(parseStatementDate(input)).toBe(expected)
  })
})
