import { describe, expect, it } from 'vitest'
import { findMatchingAccountId, normalizeAccountNumber } from './accounts'
import type { ImportLookupItem } from './types'

const accounts: ImportLookupItem[] = [
  {
    id: 'checking',
    name: 'Checking',
    externalIdentifier: '9150 0260209'
  },
  {
    id: 'savings',
    name: 'Savings',
    externalIdentifier: '020-9'
  }
]

describe('normalizeAccountNumber', () => {
  it('removes whitespace, dots, and dashes', () => {
    expect(normalizeAccountNumber(' 020-9. ')).toBe('0209')
  })
})

describe('findMatchingAccountId', () => {
  it('matches formatted account numbers', () => {
    expect(findMatchingAccountId('9150-026 0209', accounts.slice(0, 1))).toBe(
      'checking'
    )
  })

  it.each([
    '12302092123',
    '020-9123124',
    '020912123123',
    '1231230209',
    '01231020-9'
  ])(
    'matches user account id anywhere in statement account %s',
    (statement) => {
      expect(findMatchingAccountId(statement, accounts)).toBe('savings')
    }
  )

  it('returns blank for ambiguous matches', () => {
    expect(
      findMatchingAccountId('1230209123', [
        ...accounts,
        {
          id: 'other',
          name: 'Other',
          externalIdentifier: '0209'
        }
      ])
    ).toBe('')
  })
})
