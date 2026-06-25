import type { TFunction } from 'i18next'
import { describe, expect, it } from 'vitest'

import { TransactionType } from '@/api/generated/types.gen'

import { buildUpdateTransactionBody } from './map-to-update-request'

const t = ((key: string) => key) as TFunction

describe('buildUpdateTransactionBody', () => {
  it('omits splits from transfer updates', () => {
    const body = buildUpdateTransactionBody({
      t,
      hasSplits: false,
      instanceId: null,
      data: {
        transactionType: TransactionType.TRANSFER,
        name: 'Transfer',
        date: new Date('2026-06-01'),
        amount: 100,
        accountId: 'acc_from',
        transferToAccountId: 'acc_to',
        budgetId: '',
        category: null,
        recipient: null,
        sender: null,
        splits: []
      }
    })

    expect(body.type).toBe(TransactionType.TRANSFER)
    expect(body).not.toHaveProperty('splits')
  })
})
