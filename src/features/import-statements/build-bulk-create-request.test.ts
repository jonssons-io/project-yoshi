import { describe, expect, it } from 'vitest'
import { TransactionType } from '@/api/generated/types.gen'
import { buildBulkCreateRequest } from './build-bulk-create-request'
import type { TransactionDraft } from './types'

function incomeDraft(
  overrides: Partial<TransactionDraft> = {}
): TransactionDraft {
  return {
    id: 'row-1',
    sourceRowNumber: 1,
    originalDescription: 'Salary',
    date: '2026-06-20',
    amount: 1000,
    type: TransactionType.INCOME,
    name: 'Salary',
    originAccountId: 'acc_1',
    incomeSourceId: 'src_1',
    categoryId: 'cat_1',
    excluded: false,
    ...overrides
  }
}

describe('buildBulkCreateRequest', () => {
  it('omits empty income instance ids from bulk payload', () => {
    const body = buildBulkCreateRequest([
      incomeDraft({
        incomeInstanceId: ''
      })
    ])

    expect(body.transactions[0]?.instanceId).toBeNull()
  })

  it('keeps linked income instance ids', () => {
    const body = buildBulkCreateRequest([
      incomeDraft({
        incomeInstanceId: 'inc_inst_1'
      })
    ])

    expect(body.transactions[0]?.instanceId).toBe('inc_inst_1')
  })
})
