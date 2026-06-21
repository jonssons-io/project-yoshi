import { describe, expect, it } from 'vitest'
import { formatSwedishMoney, parseSwedishMoney } from './money'

describe('parseSwedishMoney', () => {
  it.each([
    [
      '-19 789,00',
      -19789
    ],
    [
      '20 714,22',
      20714.22
    ],
    [
      '-799,00',
      -799
    ],
    [
      1234.56,
      1234.56
    ]
  ])('parses %s', (input, expected) => {
    expect(parseSwedishMoney(input)).toBe(expected)
  })
})

describe('formatSwedishMoney', () => {
  it('formats Swedish money', () => {
    expect(formatSwedishMoney(20714.22)).toBe('20 714,22')
  })
})
