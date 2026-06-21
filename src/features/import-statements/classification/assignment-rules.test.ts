import { describe, expect, it } from 'vitest'
import { TransactionType } from '@/api/generated/types.gen'
import type { ImportLookupItem, TransactionDraft } from '../types'
import { applyAssignmentRules, findFuzzyRecipientId } from './assignment-rules'

const recipients: ImportLookupItem[] = [
  {
    id: 'goteborg-energi',
    name: 'Göteborg Energi'
  },
  {
    id: 'bahnhof',
    name: 'Bahnhof'
  }
]

const categories: ImportLookupItem[] = [
  {
    id: 'utilities',
    name: 'Utilities'
  }
]

function draft(overrides: Partial<TransactionDraft>): TransactionDraft {
  return {
    id: 'draft',
    sourceRowNumber: 5,
    originalDescription: 'GOTEBORG ENERGI AB',
    date: '2026-06-20',
    amount: 1487,
    type: TransactionType.EXPENSE,
    name: 'GOTEBORG ENERGI AB',
    originAccountId: 'account',
    excluded: false,
    ...overrides
  }
}

describe('findFuzzyRecipientId', () => {
  it('matches statement description to existing recipient', () => {
    expect(findFuzzyRecipientId('GOTEBORG ENERGI AB', recipients)).toBe(
      'goteborg-energi'
    )
  })

  it('returns blank when no clear recipient exists', () => {
    expect(findFuzzyRecipientId('Completely different text', recipients)).toBe(
      ''
    )
  })
})

describe('applyAssignmentRules', () => {
  it('fills recipient from fuzzy match for expenses', () => {
    const assigned = applyAssignmentRules(draft({}), {
      recipients,
      incomeSources: [],
      categories
    })

    expect(assigned.recipientId).toBe('goteborg-energi')
  })

  it('does not fuzzy-fill recipients for income rows', () => {
    const assigned = applyAssignmentRules(
      draft({
        type: TransactionType.INCOME
      }),
      {
        recipients,
        incomeSources: [],
        categories
      }
    )

    expect(assigned.recipientId).toBeUndefined()
  })
})
