import { describe, expect, it } from 'vitest'
import {
  type BillInstance,
  BillInstanceStatus,
  RecurrenceType,
  TransactionType
} from '@/api/generated/types.gen'
import type { TransactionDraft } from '../types'
import {
  findMatchingBillInstanceId,
  rankBillInstancesForDraft
} from './instance-matching'

function bill(overrides: Partial<BillInstance>): BillInstance {
  return {
    id: 'instance',
    bill: {
      id: 'tibber-bill',
      name: 'Tibber'
    },
    name: 'El',
    recipient: {
      id: 'tibber',
      name: 'Tibber'
    },
    amount: 900,
    dueDate: '2026-11-30T00:00:00.000Z',
    status: BillInstanceStatus.UPCOMING,
    recurrenceType: RecurrenceType.MONTHLY,
    archived: false,
    ...overrides
  }
}

function draft(overrides: Partial<TransactionDraft>): TransactionDraft {
  return {
    id: 'draft',
    sourceRowNumber: 5,
    originalDescription: 'TIBBER NORGE AS',
    date: '2026-11-27',
    amount: 1120,
    signedAmount: -1120,
    type: TransactionType.EXPENSE,
    name: 'TIBBER NORGE AS',
    originAccountId: 'account',
    excluded: false,
    ...overrides
  }
}

const monthlyTibber = [
  '2026-10-31',
  '2026-11-30',
  '2026-12-31',
  '2027-01-31'
].map((date) =>
  bill({
    id: `tibber-${date}`,
    dueDate: `${date}T00:00:00.000Z`
  })
)
const rent = bill({
  id: 'rent',
  bill: {
    id: 'rent-bill',
    name: 'Hyra'
  },
  name: 'Hyra',
  recipient: {
    id: 'landlord',
    name: 'Bostadsbolaget'
  },
  amount: 9500,
  dueDate: '2026-11-28T00:00:00.000Z'
})

describe('rankBillInstancesForDraft', () => {
  it('marks only the nearest instance of the matching bill as likely', () => {
    const ranked = rankBillInstancesForDraft(draft({}), [
      rent,
      ...monthlyTibber
    ])

    expect(ranked.filter((item) => item.likely)).toEqual([
      {
        instance: monthlyTibber[1],
        likely: true
      }
    ])
    expect(ranked[0].instance.id).toBe('tibber-2026-11-30')
    expect(ranked).toHaveLength(5)
  })

  it('treats an unnamed bill with the same amount and a close date as likely', () => {
    const ranked = rankBillInstancesForDraft(
      draft({
        originalDescription: 'BG 123-4567',
        amount: 9500,
        signedAmount: -9500
      }),
      [
        rent,
        ...monthlyTibber
      ]
    )

    expect(
      ranked.filter((item) => item.likely).map((item) => item.instance.id)
    ).toEqual([
      'rent'
    ])
  })

  it('has no likely match when nothing fits, but still lists everything', () => {
    const ranked = rankBillInstancesForDraft(
      draft({
        originalDescription: '2026-11-26 LEKSAKSBUTIKEN CENTRUM, GOTEBORG',
        amount: 638.5,
        signedAmount: -638.5
      }),
      [
        rent,
        ...monthlyTibber
      ]
    )

    expect(ranked.some((item) => item.likely)).toBe(false)
    expect(ranked).toHaveLength(5)
  })
})

describe('findMatchingBillInstanceId', () => {
  it('links a row whose recipient is already known to that recipient’s bill', () => {
    expect(
      findMatchingBillInstanceId(
        draft({
          originalDescription: 'Autogiro 5566778899',
          amount: 905,
          signedAmount: -905,
          recipientId: 'tibber'
        }),
        monthlyTibber,
        new Set()
      )
    ).toBe('tibber-2026-11-30')
  })

  it('does not link when the amount is far off', () => {
    expect(
      findMatchingBillInstanceId(draft({}), monthlyTibber, new Set())
    ).toBe('')
  })
})
