import type { TFunction } from 'i18next'
import { describe, expect, it } from 'vitest'
import { TransactionType } from '@/api/generated/types.gen'
import type { TransactionDraft } from '../types'
import { importValidationMessages } from './footer'

const t = ((key: string) => key) as TFunction

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
    originAccountId: 'checking',
    transferFromAccountId: 'savings',
    transferToAccountId: 'checking',
    excluded: false,
    ...overrides
  }
}

describe('importValidationMessages transfer validation', () => {
  it('accepts transfer IN when counterparty from-account is set', () => {
    expect(
      importValidationMessages(
        [
          transferDraft({
            signedAmount: 500,
            transferFromAccountId: 'savings',
            transferToAccountId: 'checking'
          })
        ],
        t
      )
    ).toEqual([])
  })

  it('rejects transfer IN when counterparty from-account is missing', () => {
    expect(
      importValidationMessages(
        [
          transferDraft({
            signedAmount: 500,
            transferFromAccountId: '',
            transferToAccountId: 'checking'
          })
        ],
        t
      )
    ).toContain('statementImport.validation.transferInvalid')
  })

  it('accepts transfer OUT when counterparty to-account is set', () => {
    expect(
      importValidationMessages(
        [
          transferDraft({
            signedAmount: -500,
            transferFromAccountId: 'checking',
            transferToAccountId: 'savings'
          })
        ],
        t
      )
    ).toEqual([])
  })

  it('rejects transfer OUT when counterparty to-account is missing', () => {
    expect(
      importValidationMessages(
        [
          transferDraft({
            signedAmount: -500,
            transferFromAccountId: 'checking',
            transferToAccountId: ''
          })
        ],
        t
      )
    ).toContain('statementImport.validation.transferInvalid')
  })
})
