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
