import { describe, expect, it } from 'vitest'
import { TransactionType } from '@/api/generated/types.gen'
import type { ImportLookupItem, TransactionDraft } from '../types'
import {
  applyHistoryByKey,
  applyHistoryDefaults,
  buildImportHistoryIndex,
  findTransferCounterpartId,
  type HistoryTransaction
} from './history-matching'

const recipients: ImportLookupItem[] = [
  {
    id: 'lunchbaren',
    name: 'Lunchbaren'
  },
  {
    id: 'ica',
    name: 'ICA'
  },
  {
    id: 'old-shop',
    name: 'Old shop',
    archived: true
  }
]
const categories: ImportLookupItem[] = [
  {
    id: 'lunch',
    name: 'Lunch'
  },
  {
    id: 'groceries',
    name: 'Groceries'
  }
]
const budgets: ImportLookupItem[] = [
  {
    id: 'food',
    name: 'Food'
  },
  {
    id: 'fun',
    name: 'Fun'
  }
]
const accounts: ImportLookupItem[] = [
  {
    id: 'card',
    name: 'Card'
  },
  {
    id: 'salary',
    name: 'Salary'
  }
]
const lookups = {
  recipients,
  incomeSources: [
    {
      id: 'anna',
      name: 'Anna'
    }
  ],
  categories,
  budgets
}

function saved(overrides: Partial<HistoryTransaction>): HistoryTransaction {
  return {
    id: 'saved',
    name: '2026-10-25 LUNCHBAREN, GOTEBORG',
    amount: 100,
    type: TransactionType.EXPENSE,
    date: '2026-10-26T00:00:00.000Z',
    createdAt: '2026-10-27T10:00:00.000Z',
    account: {
      id: 'card',
      name: 'Card'
    },
    ...overrides
  }
}

function draft(overrides: Partial<TransactionDraft>): TransactionDraft {
  return {
    id: 'draft',
    sourceRowNumber: 5,
    originalDescription: '2026-11-18 kontaktlös LUNCHBAREN, GOTEBORG',
    date: '2026-11-19',
    amount: 267,
    signedAmount: -267,
    type: TransactionType.EXPENSE,
    name: '2026-11-18 kontaktlös LUNCHBAREN, GOTEBORG',
    originAccountId: 'card',
    excluded: false,
    ...overrides
  }
}

describe('applyHistoryByKey', () => {
  it('copies recipient, category, and budget from the same vendor text', () => {
    const index = buildImportHistoryIndex([
      saved({
        recipient: {
          id: 'lunchbaren',
          name: 'Lunchbaren'
        },
        category: {
          id: 'lunch',
          name: 'Lunch'
        },
        budget: {
          id: 'food',
          name: 'Food'
        }
      })
    ])

    expect(applyHistoryByKey(draft({}), index, lookups)).toMatchObject({
      recipientId: 'lunchbaren',
      categoryId: 'lunch',
      budgetId: 'food'
    })
  })

  it('uses the most recent choice when the vendor was recategorized', () => {
    const recipient = {
      id: 'lunchbaren',
      name: 'Lunchbaren'
    }
    const index = buildImportHistoryIndex([
      saved({
        id: 'older',
        date: '2026-09-01T00:00:00.000Z',
        recipient,
        budget: {
          id: 'fun',
          name: 'Fun'
        }
      }),
      saved({
        id: 'newer',
        date: '2026-10-26T00:00:00.000Z',
        recipient,
        budget: {
          id: 'food',
          name: 'Food'
        }
      })
    ])

    expect(applyHistoryByKey(draft({}), index, lookups).budgetId).toBe('food')
  })

  it('ignores archived recipients', () => {
    const index = buildImportHistoryIndex([
      saved({
        recipient: {
          id: 'old-shop',
          name: 'Old shop'
        }
      })
    ])

    expect(applyHistoryByKey(draft({}), index, lookups).recipientId).toBe(
      undefined
    )
  })

  it('fills sender and category for incomes', () => {
    const index = buildImportHistoryIndex([
      saved({
        type: TransactionType.INCOME,
        name: 'Swish från Anna Andersson',
        incomeSource: {
          id: 'anna',
          name: 'Anna'
        },
        category: {
          id: 'groceries',
          name: 'Groceries'
        }
      })
    ])

    expect(
      applyHistoryByKey(
        draft({
          type: TransactionType.INCOME,
          originalDescription: 'Swish från Anna Andersson',
          signedAmount: 110
        }),
        index,
        lookups
      )
    ).toMatchObject({
      incomeSourceId: 'anna',
      categoryId: 'groceries'
    })
  })
})

describe('applyHistoryDefaults', () => {
  it('fills category and budget from another store of the same recipient', () => {
    const index = buildImportHistoryIndex([
      saved({
        name: '2026-10-28 MAXI ICA STORMARKNAD, STORSTAD',
        recipient: {
          id: 'ica',
          name: 'ICA'
        },
        category: {
          id: 'groceries',
          name: 'Groceries'
        },
        budget: {
          id: 'food',
          name: 'Food'
        }
      })
    ])

    expect(
      applyHistoryDefaults(
        draft({
          originalDescription: '2026-11-18 ICA KVANTUM STORTORGET, GOTEBORG',
          recipientId: 'ica'
        }),
        index,
        lookups
      )
    ).toMatchObject({
      categoryId: 'groceries',
      budgetId: 'food'
    })
  })

  it('does not copy category or budget from a split transaction', () => {
    const index = buildImportHistoryIndex([
      saved({
        recipient: {
          id: 'ica',
          name: 'ICA'
        },
        category: {
          id: 'groceries',
          name: 'Groceries'
        },
        budget: {
          id: 'food',
          name: 'Food'
        },
        splits: [
          {
            id: 'split',
            transactionId: 'saved',
            categoryId: 'groceries',
            amount: 50,
            subtitle: 'Half'
          }
        ]
      })
    ])

    const filled = applyHistoryDefaults(
      draft({
        recipientId: 'ica'
      }),
      index,
      lookups
    )
    expect(filled.categoryId).toBeFalsy()
    expect(filled.budgetId).toBeFalsy()
  })
})

describe('findTransferCounterpartId', () => {
  const index = buildImportHistoryIndex([
    saved({
      type: TransactionType.TRANSFER,
      name: 'Överf. A. Andersson',
      account: {
        id: 'salary',
        name: 'Salary'
      },
      transferToAccount: {
        id: 'card',
        name: 'Card'
      }
    })
  ])

  it('remembers where an incoming transfer with the same text came from', () => {
    expect(
      findTransferCounterpartId(
        {
          originalDescription: 'Överf. A. Andersson',
          signedAmount: 1000
        },
        index,
        accounts,
        'card'
      )
    ).toBe('salary')
  })

  it('returns blank for an unknown text', () => {
    expect(
      findTransferCounterpartId(
        {
          originalDescription: 'Överföring sparande',
          signedAmount: 1000
        },
        index,
        accounts,
        'card'
      )
    ).toBe('')
  })
})
