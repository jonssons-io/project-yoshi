import type { BudgetAllocationShortfall } from './budget-allocation-shortfall'

type BudgetLike = {
  id: string
  name: string
  remainingAmount?: number
}

/** A budget with allocation it does not need for the expense being saved. */
export type BudgetCoverDonor = {
  budgetId: string
  budgetName: string
  spare: number
}

export type BudgetCoverAllocation = {
  budgetId: string
  amount: number
}

export type BudgetCoverTransfer = {
  fromBudgetId: string
  toBudgetId: string
  amount: number
}

/** Money to move so every short budget can take its part of an expense. */
export type BudgetCoverPlan = {
  /** From the unallocated pool into a budget. */
  allocations: BudgetCoverAllocation[]
  /** From another budget's spare allocation. */
  transfers: BudgetCoverTransfer[]
}

function toCents(amount: number): number {
  return Math.round(amount * 100)
}

function fromCents(cents: number): number {
  return cents / 100
}

/** What is still missing once the whole unallocated pool has been used. */
export function shortfallBeyondPool(
  shortfalls: BudgetAllocationShortfall[],
  poolAvailable: number
): number {
  const needed = shortfalls.reduce(
    (sum, item) => sum + toCents(item.shortfall),
    0
  )
  return fromCents(Math.max(0, needed - Math.max(0, toCents(poolAvailable))))
}

/**
 * Budgets that can lend allocation: not short themselves, and with something
 * left after their own part of the expense. Largest spare first.
 */
export function findBudgetCoverDonors(params: {
  budgets: BudgetLike[]
  shortfalls: BudgetAllocationShortfall[]
  /** What the expense itself takes from each budget. */
  demandByBudgetId: Map<string, number>
}): BudgetCoverDonor[] {
  const shortIds = new Set(params.shortfalls.map((item) => item.budgetId))

  return params.budgets
    .filter((budget) => !shortIds.has(budget.id))
    .map((budget) => ({
      budgetId: budget.id,
      budgetName: budget.name,
      spare: fromCents(
        toCents(budget.remainingAmount ?? 0) -
          Math.max(0, toCents(params.demandByBudgetId.get(budget.id) ?? 0))
      )
    }))
    .filter((donor) => donor.spare > 0)
    .sort((a, b) => b.spare - a.spare)
}

/** Starting suggestion: take from the budgets with the most to spare. */
export function suggestBudgetPulls(
  donors: BudgetCoverDonor[],
  needed: number
): Record<string, number> {
  const pulls: Record<string, number> = {}
  let left = toCents(needed)

  for (const donor of donors) {
    if (left <= 0) break
    const take = Math.min(left, toCents(donor.spare))
    if (take <= 0) continue
    pulls[donor.budgetId] = fromCents(take)
    left -= take
  }

  return pulls
}

/**
 * Covers each shortfall from the unallocated pool first, then from the chosen
 * amounts of other budgets (`pulls`, by budget id).
 */
export function planBudgetCover(params: {
  shortfalls: BudgetAllocationShortfall[]
  poolAvailable: number
  pulls?: Record<string, number>
}): BudgetCoverPlan {
  const plan: BudgetCoverPlan = {
    allocations: [],
    transfers: []
  }
  let pool = Math.max(0, toCents(params.poolAvailable))
  const donors = Object.entries(params.pulls ?? {})
    .map(([budgetId, amount]) => ({
      budgetId,
      left: toCents(amount)
    }))
    .filter((donor) => donor.left > 0)

  for (const item of params.shortfalls) {
    let missing = toCents(item.shortfall)

    const fromPool = Math.min(missing, pool)
    if (fromPool > 0) {
      plan.allocations.push({
        budgetId: item.budgetId,
        amount: fromCents(fromPool)
      })
      pool -= fromPool
      missing -= fromPool
    }

    for (const donor of donors) {
      if (missing <= 0) break
      const take = Math.min(missing, donor.left)
      if (take <= 0) continue
      plan.transfers.push({
        fromBudgetId: donor.budgetId,
        toBudgetId: item.budgetId,
        amount: fromCents(take)
      })
      donor.left -= take
      missing -= take
    }
  }

  return plan
}

export type PromptBudgetPulls = (params: {
  shortfalls: BudgetAllocationShortfall[]
  poolAvailable: number
  /** What other budgets must supply in total. */
  needed: number
  donors: BudgetCoverDonor[]
  confirmLabel: string
}) => Promise<Record<string, number> | null>

/**
 * Decides how shortfalls are covered. While the unallocated pool is enough the
 * plan is made without asking; only when it runs out is the user asked which
 * budgets to take the rest from. Returns null when the user cancels.
 */
export async function resolveBudgetCover(params: {
  shortfalls: BudgetAllocationShortfall[]
  poolAvailable: number
  donors: BudgetCoverDonor[]
  confirmLabel: string
  promptPulls: PromptBudgetPulls
}): Promise<{
  plan: BudgetCoverPlan
  /** False when the pool covered everything and nothing was asked. */
  asked: boolean
} | null> {
  const { shortfalls, poolAvailable, donors, confirmLabel, promptPulls } =
    params
  const needed = shortfallBeyondPool(shortfalls, poolAvailable)

  if (needed <= 0) {
    return {
      plan: planBudgetCover({
        shortfalls,
        poolAvailable
      }),
      asked: false
    }
  }

  const pulls = await promptPulls({
    shortfalls,
    poolAvailable: Math.max(0, poolAvailable),
    needed,
    donors,
    confirmLabel
  })
  if (!pulls) return null

  return {
    plan: planBudgetCover({
      shortfalls,
      poolAvailable,
      pulls
    }),
    asked: true
  }
}

/** Runs a plan one step at a time so each step sees the result of the last. */
export async function executeBudgetCoverPlan(params: {
  plan: BudgetCoverPlan
  userId?: string | null
  createAllocationAsync: (variables: {
    budgetId: string
    amount: number
    userId?: string | null
  }) => Promise<unknown>
  transferAllocationAsync: (variables: {
    fromBudgetId: string
    toBudgetId: string
    amount: number
    userId?: string | null
  }) => Promise<unknown>
}): Promise<void> {
  const { plan, userId, createAllocationAsync, transferAllocationAsync } =
    params

  for (const allocation of plan.allocations) {
    await createAllocationAsync({
      ...allocation,
      userId
    })
  }
  for (const transfer of plan.transfers) {
    await transferAllocationAsync({
      ...transfer,
      userId
    })
  }
}
