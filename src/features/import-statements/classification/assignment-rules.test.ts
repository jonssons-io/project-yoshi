import { describe, expect, it } from 'vitest'
import { TransactionType } from '@/api/generated/types.gen'
import type { ImportLookupItem, TransactionDraft } from '../types'
import {
  applyAssignmentRules,
  findFuzzyRecipientId,
  findRecipientIdInDescription
} from './assignment-rules'
import { buildImportHistoryIndex } from './history-matching'

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
    signedAmount: -1487,
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

describe('findRecipientIdInDescription', () => {
  const shops: ImportLookupItem[] = [
    {
      id: 'coop',
      name: 'Coop'
    },
    {
      id: 'zoo',
      name: 'Zoo'
    },
    {
      id: 'arken-zoo',
      name: 'Arken Zoo'
    },
    {
      id: 'ica',
      name: 'ICA'
    }
  ]

  it('finds a recipient named inside a card purchase text', () => {
    expect(
      findRecipientIdInDescription(
        '2026-11-07 STORA COOP CENTRUM, GOTEBORG',
        shops
      )
    ).toBe('coop')
  })

  it('prefers the longest recipient name', () => {
    expect(
      findRecipientIdInDescription('2026-11-22 Arken Zoo, G teborg', shops)
    ).toBe('arken-zoo')
  })

  it('only matches whole words', () => {
    expect(
      findRecipientIdInDescription('2026-11-22 PHARMACIA, GOTEBORG', shops)
    ).toBe('')
  })
})

describe('applyAssignmentRules', () => {
  it('fills a recipient from a card purchase text with date and city', () => {
    const assigned = applyAssignmentRules(
      draft({
        originalDescription:
          '2026-06-19 kontaktlös GOTEBORG ENERGI AB, GOTEBORG'
      }),
      {
        recipients,
        incomeSources: [],
        categories
      }
    )

    expect(assigned.recipientId).toBe('goteborg-energi')
  })

  it('does not take other words containing "ica" for ICA', () => {
    const assigned = applyAssignmentRules(
      draft({
        originalDescription: '2026-06-19 MEXICANA GRILL, GOTEBORG'
      }),
      {
        recipients: [
          {
            id: 'ica',
            name: 'ICA'
          }
        ],
        incomeSources: [],
        categories: [
          {
            id: 'groceries',
            name: 'Groceries'
          }
        ]
      }
    )

    expect(assigned.recipientId).toBeUndefined()
    expect(assigned.categoryId).toBeUndefined()
  })

  it('lets the last saved choice for a vendor override the built-in rules', () => {
    const assigned = applyAssignmentRules(
      draft({
        originalDescription: '2026-06-19 ICA KVANTUM STORTORGET, GOTEBORG'
      }),
      {
        recipients: [
          {
            id: 'ica',
            name: 'ICA'
          },
          {
            id: 'ica-kvantum',
            name: 'Kvantum'
          }
        ],
        incomeSources: [],
        categories: [
          {
            id: 'groceries',
            name: 'Groceries'
          },
          {
            id: 'lunch',
            name: 'Lunch'
          }
        ],
        budgets: [
          {
            id: 'food',
            name: 'Food'
          }
        ],
        history: buildImportHistoryIndex([
          {
            id: 'saved',
            name: '2026-05-02 kontaktlös ICA KVANTUM STORTORGET, GOTEBORG',
            amount: 90,
            type: TransactionType.EXPENSE,
            date: '2026-05-03T00:00:00.000Z',
            createdAt: '2026-05-04T00:00:00.000Z',
            account: {
              id: 'account',
              name: 'Account'
            },
            recipient: {
              id: 'ica-kvantum',
              name: 'Kvantum'
            },
            category: {
              id: 'lunch',
              name: 'Lunch'
            },
            budget: {
              id: 'food',
              name: 'Food'
            }
          }
        ])
      }
    )

    expect(assigned).toMatchObject({
      recipientId: 'ica-kvantum',
      categoryId: 'lunch',
      budgetId: 'food'
    })
  })

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
