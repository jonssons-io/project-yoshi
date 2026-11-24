import { describe, expect, it } from 'vitest'
import { TransactionType } from '@/api/generated/types.gen'
import {
  findLatestAccountTransaction,
  markAlreadyImported
} from './already-imported'
import type { HistoryTransaction } from './classification/history-matching'
import type { TransactionDraft } from './types'

function saved(overrides: Partial<HistoryTransaction>): HistoryTransaction {
  return {
    id: 'saved',
    name: 'Saved',
    amount: 267,
    type: TransactionType.EXPENSE,
    date: '2026-11-19T00:00:00.000Z',
    createdAt: '2026-11-20T10:00:00.000Z',
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

describe('markAlreadyImported', () => {
  it('excludes a row saved earlier on the same account, date, and amount', () => {
    const [marked] = markAlreadyImported(
      [
        draft({})
      ],
      [
        saved({})
      ]
    )

    expect(marked).toMatchObject({
      excluded: true,
      duplicateOfTransactionId: 'saved'
    })
  })

  it('keeps rows with another amount, account, or direction', () => {
    const marked = markAlreadyImported(
      [
        draft({
          id: 'other-amount',
          amount: 268,
          signedAmount: -268
        }),
        draft({
          id: 'other-account',
          originAccountId: 'salary'
        }),
        draft({
          id: 'money-in',
          signedAmount: 267,
          type: TransactionType.INCOME
        })
      ],
      [
        saved({})
      ]
    )

    expect(marked.map((row) => row.excluded)).toEqual([
      false,
      false,
      false
    ])
  })

  it('keeps the second of two identical purchases when only one is saved', () => {
    const marked = markAlreadyImported(
      [
        draft({
          id: 'first'
        }),
        draft({
          id: 'second'
        })
      ],
      [
        saved({})
      ]
    )

    expect(marked.map((row) => row.excluded)).toEqual([
      true,
      false
    ])
  })

  it('matches a row saved on its purchase date instead of booking date', () => {
    const [marked] = markAlreadyImported(
      [
        draft({})
      ],
      [
        saved({
          date: '2026-11-18T00:00:00.000Z'
        })
      ]
    )

    expect(marked.excluded).toBe(true)
  })

  it('matches a bill payment whose date was moved to the due date', () => {
    const [marked] = markAlreadyImported(
      [
        draft({
          originalDescription: 'TIBBER NORGE AS',
          date: '2026-11-27'
        })
      ],
      [
        saved({
          date: '2026-11-30T00:00:00.000Z',
          billInstance: {
            id: 'instance',
            name: 'Tibber'
          }
        })
      ]
    )

    expect(marked.excluded).toBe(true)
  })

  it('does not stretch dates for transactions without an instance link', () => {
    const [marked] = markAlreadyImported(
      [
        draft({
          originalDescription: 'TIBBER NORGE AS',
          date: '2026-11-27'
        })
      ],
      [
        saved({
          date: '2026-11-30T00:00:00.000Z'
        })
      ]
    )

    expect(marked.excluded).toBe(false)
  })

  describe('entered on a weekend, booked on the next banking day', () => {
    // 2026-10-24 is a Saturday; noon keeps the calendar day in any time zone.
    const savedOnSaturday = saved({
      type: TransactionType.TRANSFER,
      amount: 1000,
      date: '2026-10-24T12:00:00.000Z',
      account: {
        id: 'salary',
        name: 'Salary'
      },
      transferToAccount: {
        id: 'card',
        name: 'Card'
      }
    })
    const transferRow = (overrides: Partial<TransactionDraft>) =>
      draft({
        originalDescription: 'Överföring',
        date: '2026-10-26',
        amount: 1000,
        signedAmount: 1000,
        type: TransactionType.TRANSFER,
        ...overrides
      })

    it('excludes a transfer saved on Saturday and booked on Monday', () => {
      const [marked] = markAlreadyImported(
        [
          transferRow({})
        ],
        [
          savedOnSaturday
        ]
      )

      expect(marked).toMatchObject({
        excluded: true,
        duplicateOfTransactionId: 'saved'
      })
    })

    it('excludes a Swish saved on Sunday and booked on Monday', () => {
      const [marked] = markAlreadyImported(
        [
          draft({
            originalDescription: 'Swish till Möbelhuset',
            date: '2026-10-26',
            amount: 198,
            signedAmount: -198
          })
        ],
        [
          saved({
            amount: 198,
            date: '2026-10-25T12:00:00.000Z'
          })
        ]
      )

      expect(marked.excluded).toBe(true)
    })

    it('covers only one of several equal transfers that week', () => {
      const marked = markAlreadyImported(
        [
          transferRow({
            id: 'monday'
          }),
          transferRow({
            id: 'tuesday',
            date: '2026-10-27'
          }),
          transferRow({
            id: 'thursday',
            date: '2026-10-29'
          })
        ],
        [
          savedOnSaturday
        ]
      )

      expect(marked.map((row) => row.excluded)).toEqual([
        true,
        false,
        false
      ])
    })

    it('still matches the exact day first', () => {
      const marked = markAlreadyImported(
        [
          transferRow({
            id: 'monday-new'
          }),
          transferRow({
            id: 'monday-saved'
          })
        ],
        [
          savedOnSaturday,
          {
            ...savedOnSaturday,
            id: 'saved-monday',
            date: '2026-10-26T00:00:00.000Z'
          }
        ]
      )

      // Both Monday rows are covered: one by the Monday entry, one by Saturday's.
      expect(marked.map((row) => row.duplicateOfTransactionId).sort()).toEqual([
        'saved',
        'saved-monday'
      ])
    })

    it('does not reach back from a weekday to an earlier weekday', () => {
      // Saved on Tuesday 3 Nov, new equal transfer booked Thursday 5 Nov.
      const [marked] = markAlreadyImported(
        [
          transferRow({
            date: '2026-11-05'
          })
        ],
        [
          {
            ...savedOnSaturday,
            date: '2026-11-03T12:00:00.000Z'
          }
        ]
      )

      expect(marked.excluded).toBe(false)
    })

    it('does not apply past the following Tuesday', () => {
      const [marked] = markAlreadyImported(
        [
          transferRow({
            date: '2026-10-28'
          })
        ],
        [
          savedOnSaturday
        ]
      )

      expect(marked.excluded).toBe(false)
    })

    it('leaves card purchases to their purchase date', () => {
      // Same sum two days apart is a new purchase, not Saturday's again.
      const [marked] = markAlreadyImported(
        [
          draft({
            originalDescription: '2026-10-25 LUNCHBAREN, GOTEBORG',
            date: '2026-10-26',
            amount: 280,
            signedAmount: -280
          })
        ],
        [
          saved({
            amount: 280,
            date: '2026-10-24T12:00:00.000Z'
          })
        ]
      )

      expect(marked.excluded).toBe(false)
    })
  })

  it('recognizes a transfer saved from the other account', () => {
    const transfer = saved({
      type: TransactionType.TRANSFER,
      amount: 1000,
      date: '2026-11-23T00:00:00.000Z',
      account: {
        id: 'salary',
        name: 'Salary'
      },
      transferToAccount: {
        id: 'card',
        name: 'Card'
      }
    })
    const incoming = draft({
      originalDescription: 'Överf. A. Andersson',
      date: '2026-11-23',
      amount: 1000,
      signedAmount: 1000,
      type: TransactionType.TRANSFER
    })

    expect(
      markAlreadyImported(
        [
          incoming
        ],
        [
          transfer
        ]
      )[0].excluded
    ).toBe(true)
    // The same transfer also covers the outgoing row of the other statement.
    expect(
      markAlreadyImported(
        [
          {
            ...incoming,
            originAccountId: 'salary',
            signedAmount: -1000
          }
        ],
        [
          transfer
        ]
      )[0].excluded
    ).toBe(true)
  })

  it('clears an earlier mark when the row no longer matches', () => {
    const [marked] = markAlreadyImported(
      [
        draft({
          excluded: true,
          duplicateOfTransactionId: 'gone'
        })
      ],
      []
    )

    expect(marked.excluded).toBe(false)
    expect(marked.duplicateOfTransactionId).toBeUndefined()
  })
})

describe('findLatestAccountTransaction', () => {
  it('returns the newest transaction on the account that is not in the future', () => {
    const latest = findLatestAccountTransaction(
      [
        saved({
          id: 'older',
          name: 'Older',
          date: '2026-11-10T00:00:00.000Z'
        }),
        saved({
          id: 'newest',
          name: 'Newest',
          date: '2026-11-19T00:00:00.000Z'
        }),
        saved({
          id: 'future',
          name: 'Future',
          date: '2026-12-24T00:00:00.000Z'
        }),
        saved({
          id: 'elsewhere',
          name: 'Elsewhere',
          date: '2026-11-22T00:00:00.000Z',
          account: {
            id: 'salary',
            name: 'Salary'
          }
        })
      ],
      'card',
      new Date('2026-11-24T12:00:00.000Z')
    )

    expect(latest?.name).toBe('Newest')
  })

  it('returns null without an account', () => {
    expect(
      findLatestAccountTransaction(
        [
          saved({})
        ],
        ''
      )
    ).toBeNull()
  })
})
