import { describe, expect, it, vi } from 'vitest'
import type { BudgetAllocationShortfall } from './budget-allocation-shortfall'
import {
  executeBudgetCoverPlan,
  findBudgetCoverDonors,
  planBudgetCover,
  resolveBudgetCover,
  shortfallBeyondPool,
  suggestBudgetPulls
} from './budget-cover-plan'

const shortfalls: BudgetAllocationShortfall[] = [
  {
    budgetId: 'food',
    budgetName: 'Food',
    expenseAmount: 300,
    remainingAmount: 100,
    shortfall: 200
  },
  {
    budgetId: 'pets',
    budgetName: 'Pets',
    expenseAmount: 150,
    remainingAmount: 0,
    shortfall: 150
  }
]

const budgets = [
  {
    id: 'food',
    name: 'Food',
    remainingAmount: 100
  },
  {
    id: 'pets',
    name: 'Pets',
    remainingAmount: 0
  },
  {
    id: 'fun',
    name: 'Fun',
    remainingAmount: 500
  },
  {
    id: 'car',
    name: 'Car',
    remainingAmount: 1200
  },
  {
    id: 'empty',
    name: 'Empty',
    remainingAmount: 0
  }
]

describe('shortfallBeyondPool', () => {
  it('is zero while the pool covers every shortfall', () => {
    expect(shortfallBeyondPool(shortfalls, 350)).toBe(0)
    expect(shortfallBeyondPool(shortfalls, 5000)).toBe(0)
  })

  it('is what the pool cannot cover', () => {
    expect(shortfallBeyondPool(shortfalls, 100.5)).toBe(249.5)
    expect(shortfallBeyondPool(shortfalls, 0)).toBe(350)
    expect(shortfallBeyondPool(shortfalls, -40)).toBe(350)
  })
})

describe('findBudgetCoverDonors', () => {
  it('offers budgets with money left, largest first, never the short ones', () => {
    expect(
      findBudgetCoverDonors({
        budgets,
        shortfalls,
        demandByBudgetId: new Map()
      })
    ).toEqual([
      {
        budgetId: 'car',
        budgetName: 'Car',
        spare: 1200
      },
      {
        budgetId: 'fun',
        budgetName: 'Fun',
        spare: 500
      }
    ])
  })

  it('keeps back what the expense itself takes from a budget', () => {
    const donors = findBudgetCoverDonors({
      budgets,
      shortfalls,
      demandByBudgetId: new Map([
        [
          'fun',
          500
        ],
        [
          'car',
          200
        ]
      ])
    })

    expect(donors).toEqual([
      {
        budgetId: 'car',
        budgetName: 'Car',
        spare: 1000
      }
    ])
  })
})

describe('suggestBudgetPulls', () => {
  it('takes from the budgets with the most to spare until covered', () => {
    const donors = findBudgetCoverDonors({
      budgets,
      shortfalls,
      demandByBudgetId: new Map()
    })

    expect(suggestBudgetPulls(donors, 350)).toEqual({
      car: 350
    })
    expect(suggestBudgetPulls(donors, 1500)).toEqual({
      car: 1200,
      fun: 300
    })
  })
})

describe('planBudgetCover', () => {
  it('allocates exactly each shortfall when the pool is enough', () => {
    expect(
      planBudgetCover({
        shortfalls,
        poolAvailable: 1000
      })
    ).toEqual({
      allocations: [
        {
          budgetId: 'food',
          amount: 200
        },
        {
          budgetId: 'pets',
          amount: 150
        }
      ],
      transfers: []
    })
  })

  it('uses the pool first and moves the rest from the chosen budgets', () => {
    expect(
      planBudgetCover({
        shortfalls,
        poolAvailable: 250,
        pulls: {
          fun: 60,
          car: 40
        }
      })
    ).toEqual({
      allocations: [
        {
          budgetId: 'food',
          amount: 200
        },
        {
          budgetId: 'pets',
          amount: 50
        }
      ],
      transfers: [
        {
          fromBudgetId: 'fun',
          toBudgetId: 'pets',
          amount: 60
        },
        {
          fromBudgetId: 'car',
          toBudgetId: 'pets',
          amount: 40
        }
      ]
    })
  })

  it('splits one budget across several short budgets when the pool is empty', () => {
    expect(
      planBudgetCover({
        shortfalls,
        poolAvailable: 0,
        pulls: {
          car: 350
        }
      }).transfers
    ).toEqual([
      {
        fromBudgetId: 'car',
        toBudgetId: 'food',
        amount: 200
      },
      {
        fromBudgetId: 'car',
        toBudgetId: 'pets',
        amount: 150
      }
    ])
  })
})

describe('resolveBudgetCover', () => {
  const donors = findBudgetCoverDonors({
    budgets,
    shortfalls,
    demandByBudgetId: new Map()
  })

  it('does not ask while the pool is enough', async () => {
    const promptPulls = vi.fn()
    const cover = await resolveBudgetCover({
      shortfalls,
      poolAvailable: 350,
      donors,
      confirmLabel: 'Save',
      promptPulls
    })

    expect(promptPulls).not.toHaveBeenCalled()
    expect(cover?.asked).toBe(false)
    expect(cover?.plan.allocations).toHaveLength(2)
    expect(cover?.plan.transfers).toHaveLength(0)
  })

  it('asks which budgets to take from when the pool runs out', async () => {
    const promptPulls = vi.fn(async () => ({
      car: 250
    }))
    const cover = await resolveBudgetCover({
      shortfalls,
      poolAvailable: 100,
      donors,
      confirmLabel: 'Save',
      promptPulls
    })

    expect(promptPulls).toHaveBeenCalledWith({
      shortfalls,
      poolAvailable: 100,
      needed: 250,
      donors,
      confirmLabel: 'Save'
    })
    expect(cover?.asked).toBe(true)
    expect(cover?.plan).toEqual({
      allocations: [
        {
          budgetId: 'food',
          amount: 100
        }
      ],
      transfers: [
        {
          fromBudgetId: 'car',
          toBudgetId: 'food',
          amount: 100
        },
        {
          fromBudgetId: 'car',
          toBudgetId: 'pets',
          amount: 150
        }
      ]
    })
  })

  it('returns null when the user cancels', async () => {
    expect(
      await resolveBudgetCover({
        shortfalls,
        poolAvailable: 0,
        donors,
        confirmLabel: 'Save',
        promptPulls: async () => null
      })
    ).toBeNull()
  })
})

describe('executeBudgetCoverPlan', () => {
  it('allocates from the pool before moving between budgets', async () => {
    const calls: string[] = []

    await executeBudgetCoverPlan({
      plan: {
        allocations: [
          {
            budgetId: 'food',
            amount: 100
          }
        ],
        transfers: [
          {
            fromBudgetId: 'car',
            toBudgetId: 'pets',
            amount: 150
          }
        ]
      },
      userId: 'user',
      createAllocationAsync: async ({ budgetId }) => {
        calls.push(`allocate:${budgetId}`)
      },
      transferAllocationAsync: async ({ fromBudgetId, toBudgetId }) => {
        calls.push(`move:${fromBudgetId}>${toBudgetId}`)
      }
    })

    expect(calls).toEqual([
      'allocate:food',
      'move:car>pets'
    ])
  })
})
