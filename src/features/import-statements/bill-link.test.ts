import { describe, expect, it } from 'vitest'
import { TransactionType } from '@/api/generated/types.gen'
import {
  activeBillSplits,
  isLockedToBill,
  scaleSplitsToAmount
} from './bill-link'
import { buildBulkCreateRequest } from './build-bulk-create-request'
import { buildBillInstancePatch } from './classification/instance-matching'
import { expenseLinesFromImportDrafts } from './import-budget-shortfalls'
import type { DraftBillSplit, TransactionDraft } from './types'

function draft(overrides: Partial<TransactionDraft> = {}): TransactionDraft {
  return {
    id: 'draft',
    sourceRowNumber: 5,
    originalDescription: 'Autogiro Sparbolaget',
    date: '2026-06-26',
    amount: 2700,
    signedAmount: -2700,
    type: TransactionType.EXPENSE,
    name: 'Autogiro Sparbolaget',
    originAccountId: 'account',
    excluded: false,
    ...overrides
  }
}

const splits: DraftBillSplit[] = [
  {
    subtitle: 'Buffer',
    amount: 200,
    budgetId: 'buffer',
    categoryId: 'saving'
  },
  {
    subtitle: 'Travel',
    amount: 1000,
    budgetId: 'travel',
    categoryId: 'saving'
  },
  {
    subtitle: 'Pension',
    amount: 1500,
    budgetId: 'pension',
    categoryId: 'pension'
  }
]

const splitBill = {
  id: 'instance',
  name: 'Sparande',
  recipient: {
    id: 'sparbolaget',
    name: 'Sparbolaget'
  },
  amount: 2700,
  dueDate: '2026-06-25T00:00:00.000Z',
  budget: null,
  category: null,
  splits
}

const plainBill = {
  id: 'instance',
  name: 'Bredband',
  recipient: {
    id: 'isp',
    name: 'Bredbandsbolaget'
  },
  amount: 579,
  dueDate: '2026-06-30T00:00:00.000Z',
  budget: {
    id: 'home',
    name: 'Home'
  },
  category: {
    id: 'internet',
    name: 'Internet'
  }
}

describe('buildBillInstancePatch', () => {
  it('takes name, recipient, budget, and category from the bill and locks the row', () => {
    const linked = {
      ...draft({
        billFieldsUnlocked: true
      }),
      ...buildBillInstancePatch(plainBill)
    }

    expect(linked).toMatchObject({
      billInstanceId: 'instance',
      name: 'Bredband',
      recipientId: 'isp',
      budgetId: 'home',
      categoryId: 'internet'
    })
    expect(isLockedToBill(linked)).toBe(true)
  })

  it('keeps the bank date instead of the due date', () => {
    const linked = {
      ...draft({}),
      ...buildBillInstancePatch(plainBill)
    }

    expect(linked.date).toBe('2026-06-26')
  })

  it('carries the lines of a split bill instead of one budget and category', () => {
    const linked = {
      ...draft({}),
      ...buildBillInstancePatch(splitBill)
    }

    expect(linked.budgetId).toBeNull()
    expect(linked.categoryId).toBeNull()
    expect(activeBillSplits(linked)).toEqual(splits)
  })
})

describe('isLockedToBill', () => {
  it('is false without a bill, once unlocked, and for other row types', () => {
    expect(isLockedToBill(draft({}))).toBe(false)
    expect(
      isLockedToBill(
        draft({
          billInstanceId: 'instance',
          billFieldsUnlocked: true
        })
      )
    ).toBe(false)
    expect(
      isLockedToBill(
        draft({
          billInstanceId: 'instance',
          type: TransactionType.TRANSFER
        })
      )
    ).toBe(false)
  })
})

describe('scaleSplitsToAmount', () => {
  it('leaves lines alone when the payment equals the bill', () => {
    expect(scaleSplitsToAmount(splits, 2700)).toBe(splits)
  })

  it('keeps each line’s share when the payment differs and still adds up', () => {
    const scaled = scaleSplitsToAmount(splits, 2000)

    expect(scaled.map((split) => split.amount)).toEqual([
      148.15,
      740.74,
      1111.11
    ])
    expect(
      Math.round(scaled.reduce((sum, split) => sum + split.amount, 0) * 100)
    ).toBe(200000)
  })
})

describe('a row following a split bill', () => {
  const linked = draft({
    billInstanceId: 'instance',
    billSplits: splits,
    recipientId: 'sparbolaget',
    budgetId: null,
    categoryId: null
  })

  it('is saved with the bill’s lines', () => {
    const [item] = buildBulkCreateRequest([
      linked
    ]).transactions

    expect(item).toMatchObject({
      instanceId: 'instance',
      budgetId: null,
      categoryId: null,
      amount: 2700,
      splits: [
        {
          subtitle: 'Buffer',
          amount: 200,
          budgetId: 'buffer',
          categoryId: 'saving'
        },
        {
          subtitle: 'Travel',
          amount: 1000,
          budgetId: 'travel',
          categoryId: 'saving'
        },
        {
          subtitle: 'Pension',
          amount: 1500,
          budgetId: 'pension',
          categoryId: 'pension'
        }
      ]
    })
  })

  it('draws on each line’s budget', () => {
    expect(
      expenseLinesFromImportDrafts([
        linked
      ])
    ).toEqual([
      {
        budgetId: 'buffer',
        amount: 200
      },
      {
        budgetId: 'travel',
        amount: 1000
      },
      {
        budgetId: 'pension',
        amount: 1500
      }
    ])
  })

  it('falls back to its own budget and category once unlocked', () => {
    const unlocked = {
      ...linked,
      billFieldsUnlocked: true,
      budgetId: 'travel',
      categoryId: 'saving'
    }
    const [item] = buildBulkCreateRequest([
      unlocked
    ]).transactions

    expect(activeBillSplits(unlocked)).toEqual([])
    expect(item).toMatchObject({
      instanceId: 'instance',
      budgetId: 'travel'
    })
    expect('splits' in item).toBe(false)
  })
})
