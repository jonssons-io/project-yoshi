import type { TFunction } from 'i18next'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BudgetAllocationShortfall } from './budget-allocation-shortfall'
import { submitExpenseWithOptionalAllocation } from './submit-expense-with-allocation'

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn()
  }
}))

const t = ((key: string) => key) as unknown as TFunction

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

const donors = [
  {
    budgetId: 'car',
    budgetName: 'Car',
    spare: 1200
  }
]

type Params = Parameters<typeof submitExpenseWithOptionalAllocation>[0]

function setup(overrides: Partial<Params> = {}) {
  const calls: string[] = []
  const params: Params = {
    shortfalls,
    unallocatedAmount: 1000,
    donors,
    userId: 'user',
    confirmLabel: 'Save',
    t,
    promptBudgetPulls: vi.fn(async () => ({
      car: 350
    })),
    createAllocationAsync: vi.fn(async ({ budgetId, amount }) => {
      calls.push(`allocate:${budgetId}:${amount}`)
    }),
    transferAllocationAsync: vi.fn(
      async ({ fromBudgetId, toBudgetId, amount }) => {
        calls.push(`move:${fromBudgetId}>${toBudgetId}:${amount}`)
      }
    ),
    submitTransaction: vi.fn(async () => {
      calls.push('submit')
    }),
    ...overrides
  }
  return {
    params,
    calls
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('submitExpenseWithOptionalAllocation', () => {
  it('tops up every short budget from the pool without asking', async () => {
    const { params, calls } = setup()

    expect(await submitExpenseWithOptionalAllocation(params)).toBe(true)
    expect(params.promptBudgetPulls).not.toHaveBeenCalled()
    expect(calls).toEqual([
      'allocate:food:200',
      'allocate:pets:150',
      'submit'
    ])
    expect(toast.info).toHaveBeenCalledTimes(1)
  })

  it('asks only when the pool is empty, then moves from the chosen budget', async () => {
    const { params, calls } = setup({
      unallocatedAmount: 0
    })

    expect(await submitExpenseWithOptionalAllocation(params)).toBe(true)
    expect(params.promptBudgetPulls).toHaveBeenCalledTimes(1)
    expect(calls).toEqual([
      'move:car>food:200',
      'move:car>pets:150',
      'submit'
    ])
    expect(toast.info).not.toHaveBeenCalled()
  })

  it('saves nothing when the dialog is cancelled', async () => {
    const { params, calls } = setup({
      unallocatedAmount: 0,
      promptBudgetPulls: vi.fn(async () => null)
    })

    expect(await submitExpenseWithOptionalAllocation(params)).toBe(false)
    expect(calls).toEqual([])
  })

  it('does not save the expense when an allocation fails', async () => {
    const { params, calls } = setup({
      createAllocationAsync: vi.fn(async () => {
        throw new Error('pool is empty')
      })
    })

    expect(await submitExpenseWithOptionalAllocation(params)).toBe(false)
    expect(calls).toEqual([])
    expect(toast.error).toHaveBeenCalledTimes(1)
  })

  it('goes straight to saving when no budget is short', async () => {
    const { params, calls } = setup({
      shortfalls: []
    })

    expect(await submitExpenseWithOptionalAllocation(params)).toBe(true)
    expect(calls).toEqual([
      'submit'
    ])
    expect(toast.info).not.toHaveBeenCalled()
  })
})
