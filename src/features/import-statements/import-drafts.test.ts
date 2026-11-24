import { describe, expect, it } from 'vitest'
import { TransactionType } from '@/api/generated/types.gen'
import {
  applyTransferAccountDefaults,
  buildDraftsFromStatement,
  buildDraftsFromStatements,
  changeOriginAccountInPlace,
  importHistoryStartDate
} from './import-drafts'
import type {
  ImportLookupItem,
  StatementParseResult,
  TransactionDraft
} from './types'

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

describe('buildDraftsFromStatements', () => {
  const checkingStatement: StatementParseResult = {
    accountNumber: '9150-026 0209',
    invalidRows: [],
    transactions: [
      transferDraft({
        id: 'checking-in',
        signedAmount: 1000,
        amount: 1000,
        date: '2026-06-20',
        originalDescription: 'Överf. A. Andersson'
      }),
      transferDraft({
        id: 'checking-in-saved',
        signedAmount: 500,
        amount: 500,
        date: '2026-06-18',
        originalDescription: 'Överf. A. Andersson'
      })
    ]
  }
  const savingsStatement: StatementParseResult = {
    accountNumber: '5555-6666 777',
    invalidRows: [],
    transactions: [
      transferDraft({
        id: 'savings-out',
        signedAmount: -1000,
        amount: 1000,
        date: '2026-06-20',
        originalDescription: 'Överföring'
      })
    ]
  }
  const lookups = {
    accounts,
    recipients: [],
    incomeSources: [],
    categories: [],
    history: [
      {
        id: 'saved-transfer',
        name: 'Överf. A. Andersson',
        amount: 500,
        type: TransactionType.TRANSFER,
        date: '2026-06-18T00:00:00.000Z',
        createdAt: '2026-06-19T00:00:00.000Z',
        account: {
          id: 'savings',
          name: 'Savings'
        },
        transferToAccount: {
          id: 'checking',
          name: 'Checking'
        }
      }
    ]
  }

  it('matches each file to its account and pairs money moved between them', () => {
    const { originAccountIds, drafts } = buildDraftsFromStatements(
      [
        {
          fileName: 'checking.xlsx',
          result: checkingStatement
        },
        {
          fileName: 'savings.xlsx',
          result: savingsStatement
        }
      ],
      lookups
    )

    expect(originAccountIds).toEqual([
      'checking',
      'savings'
    ])
    expect(drafts.find((draft) => draft.id === 'savings-out')).toMatchObject({
      statementIndex: 1,
      excluded: false,
      transferFromAccountId: 'savings',
      transferToAccountId: 'checking',
      pairedWithDraftId: 'checking-in'
    })
    expect(drafts.find((draft) => draft.id === 'checking-in')).toMatchObject({
      statementIndex: 0,
      excluded: true,
      pairedWithDraftId: 'savings-out'
    })
  })

  it('excludes rows that are already saved', () => {
    const { drafts } = buildDraftsFromStatements(
      [
        {
          fileName: 'checking.xlsx',
          result: checkingStatement
        }
      ],
      lookups
    )

    expect(
      drafts.find((draft) => draft.id === 'checking-in-saved')
    ).toMatchObject({
      excluded: true,
      duplicateOfTransactionId: 'saved-transfer'
    })
  })

  it('fills the other account from an earlier transfer with the same text', () => {
    const { drafts } = buildDraftsFromStatements(
      [
        {
          fileName: 'checking.xlsx',
          result: checkingStatement
        }
      ],
      lookups
    )

    expect(drafts.find((draft) => draft.id === 'checking-in')).toMatchObject({
      excluded: false,
      transferFromAccountId: 'savings',
      transferToAccountId: 'checking'
    })
  })

  it('uses an account chosen by the user instead of the account number', () => {
    const { originAccountIds, drafts } = buildDraftsFromStatements(
      [
        {
          fileName: 'unknown.xlsx',
          result: {
            ...savingsStatement,
            accountNumber: null
          }
        }
      ],
      lookups,
      [
        'savings'
      ]
    )

    expect(originAccountIds).toEqual([
      'savings'
    ])
    expect(drafts[0].originAccountId).toBe('savings')
  })
})

describe('changeOriginAccountInPlace', () => {
  it('moves one statement and the paired side of its transfers', () => {
    const moved = changeOriginAccountInPlace(
      [
        transferDraft({
          id: 'out',
          statementIndex: 0,
          signedAmount: -1000,
          originAccountId: 'savings',
          transferFromAccountId: 'savings',
          transferToAccountId: '',
          pairedWithDraftId: 'in'
        }),
        transferDraft({
          id: 'in',
          statementIndex: 1,
          signedAmount: 1000,
          originAccountId: '',
          transferFromAccountId: 'savings',
          transferToAccountId: '',
          pairedWithDraftId: 'out',
          excluded: true
        })
      ],
      1,
      'checking'
    )

    expect(moved[0]).toMatchObject({
      originAccountId: 'savings',
      transferFromAccountId: 'savings',
      transferToAccountId: 'checking'
    })
    expect(moved[1]).toMatchObject({
      originAccountId: 'checking',
      transferFromAccountId: 'savings',
      transferToAccountId: 'checking'
    })
  })
})

describe('importHistoryStartDate', () => {
  it('starts a year before the oldest statement row', () => {
    expect(
      importHistoryStartDate([
        {
          fileName: 'a.xlsx',
          result: {
            accountNumber: null,
            invalidRows: [],
            transactions: [
              transferDraft({
                date: '2026-06-20'
              }),
              transferDraft({
                date: '2026-06-01'
              })
            ]
          }
        }
      ])?.toISOString()
    ).toBe('2025-06-01T00:00:00.000Z')
  })

  it('is undefined without statements', () => {
    expect(importHistoryStartDate([])).toBeUndefined()
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
