import { describe, expect, it } from 'vitest'
import { TransactionType } from '@/api/generated/types.gen'
import {
  applyTransferAccountDefaults,
  buildDraftsFromStatement
} from './import-drafts'
import type { ImportLookupItem, StatementParseResult, TransactionDraft } from './types'

const accounts: ImportLookupItem[] = [
  {
    id: 'checking',
    name: 'Checking',
    externalIdentifier: '9150 0260209'
  },
  {
    id: 'savings',
    name: 'Savings',
    externalIdentifier: '5555 6666777'
  }
]

function transferDraft(
  overrides: Partial<TransactionDraft> = {}
): TransactionDraft {
  return {
    id: 'transfer-1',
    sourceRowNumber: 10,
    originalDescription: 'Överföring',
    date: '2026-06-20',
    amount: 500,
    signedAmount: 500,
    type: TransactionType.TRANSFER,
    name: 'Överföring',
    originAccountId: '',
    excluded: false,
    ...overrides
  }
}

describe('applyTransferAccountDefaults', () => {
  it('sets origin on Till konto for transfer IN (positive signed amount)', () => {
    expect(
      applyTransferAccountDefaults(
        {
          originalDescription: 'Överföring till sparkonto',
          signedAmount: 500
        },
        accounts,
        'checking'
      )
    ).toEqual({
      transferFromAccountId: '',
      transferToAccountId: 'checking'
    })
  })

  it('sets origin on Från konto for transfer OUT (negative signed amount)', () => {
    expect(
      applyTransferAccountDefaults(
        {
          originalDescription: 'Överföring från sparkonto',
          signedAmount: -500
        },
        accounts,
        'checking'
      )
    ).toEqual({
      transferFromAccountId: 'checking',
      transferToAccountId: ''
    })
  })

  it('matches counterparty account number from description', () => {
    expect(
      applyTransferAccountDefaults(
        {
          originalDescription: 'Överföring 9150-026 0209',
          signedAmount: -750
        },
        accounts,
        'savings'
      )
    ).toEqual({
      transferFromAccountId: 'savings',
      transferToAccountId: 'checking'
    })
  })
})

describe('buildDraftsFromStatement', () => {
  it('assigns transfer from/to using signed statement amounts', () => {
    const result: StatementParseResult = {
      accountNumber: '9150-026 0209',
      invalidRows: [],
      transactions: [
        transferDraft({
          id: 'in',
          signedAmount: 1200,
          amount: 1200,
          originalDescription: 'Överföring in'
        }),
        transferDraft({
          id: 'out',
          signedAmount: -800,
          amount: 800,
          originalDescription: 'Överföring till 5555-6666 777'
        })
      ]
    }

    const { originAccountId, drafts } = buildDraftsFromStatement(result, {
      accounts,
      recipients: [],
      incomeSources: [],
      categories: []
    })

    expect(originAccountId).toBe('checking')

    const transferIn = drafts.find((draft) => draft.id === 'in')
    expect(transferIn).toMatchObject({
      transferFromAccountId: '',
      transferToAccountId: 'checking'
    })

    const transferOut = drafts.find((draft) => draft.id === 'out')
    expect(transferOut).toMatchObject({
      transferFromAccountId: 'checking',
      transferToAccountId: 'savings'
    })
  })

  it('preserves signedAmount on parsed drafts while keeping amount absolute', () => {
    const result: StatementParseResult = {
      accountNumber: '9150-026 0209',
      invalidRows: [],
      transactions: [
        transferDraft({
          signedAmount: -250,
          amount: 250
        })
      ]
    }

    const { drafts } = buildDraftsFromStatement(result, {
      accounts,
      recipients: [],
      incomeSources: [],
      categories: []
    })

    expect(drafts[0]).toMatchObject({
      amount: 250,
      signedAmount: -250
    })
  })
})
