import { describe, expect, it } from 'vitest'
import { TransactionType } from '@/api/generated/types.gen'
import { classifyTransaction } from './classify-transaction'

describe('classifyTransaction', () => {
  it.each([
    [
      'Överföring 9150 0260209',
      -2000,
      TransactionType.TRANSFER
    ],
    [
      'Överf. G. Jonsson',
      400,
      TransactionType.TRANSFER
    ],
    [
      'Göteborg Energi AB',
      -1487,
      TransactionType.EXPENSE
    ],
    [
      'LÖN',
      44417,
      TransactionType.INCOME
    ]
  ])('classifies %s', (description, amount, expected) => {
    expect(classifyTransaction(description, amount)).toBe(expected)
  })
})
