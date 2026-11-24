import { describe, expect, it } from 'vitest'
import { TransactionType } from '@/api/generated/types.gen'
import { pairTransfersAcrossStatements } from './transfer-pairing'
import type { TransactionDraft } from './types'

function row(overrides: Partial<TransactionDraft>): TransactionDraft {
  const signedAmount = overrides.signedAmount ?? -1000
  return {
    id: 'row',
    statementIndex: 0,
    sourceRowNumber: 5,
    originalDescription: 'Överf. A. Andersson',
    date: '2026-11-23',
    amount: Math.abs(signedAmount),
    signedAmount,
    type: TransactionType.TRANSFER,
    name: 'Överf. A. Andersson',
    originAccountId: 'salary',
    excluded: false,
    ...overrides
  }
}

const outgoing = row({
  id: 'out',
  statementIndex: 0,
  originAccountId: 'salary',
  signedAmount: -1000,
  transferFromAccountId: 'salary',
  transferToAccountId: ''
})
const incoming = row({
  id: 'in',
  statementIndex: 1,
  originAccountId: 'card',
  signedAmount: 1000,
  transferFromAccountId: '',
  transferToAccountId: 'card'
})

describe('pairTransfersAcrossStatements', () => {
  it('turns -1000 on one account and +1000 on another into one transfer', () => {
    const [out, into] = pairTransfersAcrossStatements([
      outgoing,
      incoming
    ])

    expect(out).toMatchObject({
      excluded: false,
      transferFromAccountId: 'salary',
      transferToAccountId: 'card',
      pairedWithDraftId: 'in'
    })
    expect(into).toMatchObject({
      excluded: true,
      transferFromAccountId: 'salary',
      transferToAccountId: 'card',
      pairedWithDraftId: 'out'
    })
  })

  it('does not pair rows from the same statement or the same account', () => {
    const sameStatement = pairTransfersAcrossStatements([
      outgoing,
      {
        ...incoming,
        statementIndex: 0
      }
    ])
    const sameAccount = pairTransfersAcrossStatements([
      outgoing,
      {
        ...incoming,
        originAccountId: 'salary'
      }
    ])

    expect(sameStatement.every((draft) => !draft.pairedWithDraftId)).toBe(true)
    expect(sameAccount.every((draft) => !draft.pairedWithDraftId)).toBe(true)
  })

  it('does not pair different amounts', () => {
    const paired = pairTransfersAcrossStatements([
      outgoing,
      {
        ...incoming,
        amount: 999,
        signedAmount: 999
      }
    ])

    expect(paired.every((draft) => !draft.pairedWithDraftId)).toBe(true)
  })

  it('pairs each row once when the same amount moves several times', () => {
    const paired = pairTransfersAcrossStatements([
      outgoing,
      {
        ...outgoing,
        id: 'out-2'
      },
      incoming
    ])

    expect(paired.filter((draft) => draft.pairedWithDraftId)).toHaveLength(2)
    expect(
      paired.find((draft) => draft.id === 'out-2')?.pairedWithDraftId
    ).toBe(undefined)
  })

  it('prefers the same day over a nearby day', () => {
    const paired = pairTransfersAcrossStatements([
      outgoing,
      {
        ...incoming,
        id: 'in-next-day',
        date: '2026-11-24'
      },
      {
        ...incoming,
        id: 'in-same-day'
      }
    ])

    expect(paired[0].pairedWithDraftId).toBe('in-same-day')
  })

  it('pairs transfers booked a few days apart', () => {
    const [out] = pairTransfersAcrossStatements([
      {
        ...outgoing,
        date: '2026-11-20'
      },
      incoming
    ])

    expect(out.pairedWithDraftId).toBe('in')
  })

  it('reclassifies an unlabelled row on the same day as the other side', () => {
    const [out, into] = pairTransfersAcrossStatements([
      outgoing,
      {
        ...incoming,
        type: TransactionType.INCOME,
        originalDescription: 'Insättning'
      }
    ])

    expect(out.pairedWithDraftId).toBe('in')
    expect(into.type).toBe(TransactionType.TRANSFER)
  })

  it('never treats a card purchase or a known vendor as a transfer', () => {
    const cardPurchase = pairTransfersAcrossStatements([
      {
        ...outgoing,
        type: TransactionType.EXPENSE,
        originalDescription: '2026-11-22 CITY GROSS NORR, STORSTAD'
      },
      incoming
    ])
    const knownVendor = pairTransfersAcrossStatements([
      {
        ...outgoing,
        type: TransactionType.EXPENSE,
        originalDescription: 'Autogiro TIBBER',
        recipientId: 'tibber'
      },
      incoming
    ])

    expect(cardPurchase.every((draft) => !draft.pairedWithDraftId)).toBe(true)
    expect(knownVendor.every((draft) => !draft.pairedWithDraftId)).toBe(true)
  })

  it('leaves an expense and an income with the same amount alone', () => {
    const paired = pairTransfersAcrossStatements([
      {
        ...outgoing,
        type: TransactionType.EXPENSE,
        originalDescription: 'Swish till Butiken'
      },
      {
        ...incoming,
        type: TransactionType.INCOME,
        originalDescription: 'Swish från Anna Andersson'
      }
    ])

    expect(paired.every((draft) => !draft.pairedWithDraftId)).toBe(true)
  })

  it('skips rows that are already excluded', () => {
    const paired = pairTransfersAcrossStatements([
      outgoing,
      {
        ...incoming,
        excluded: true,
        duplicateOfTransactionId: 'saved'
      }
    ])

    expect(paired[0].pairedWithDraftId).toBeUndefined()
  })
})
