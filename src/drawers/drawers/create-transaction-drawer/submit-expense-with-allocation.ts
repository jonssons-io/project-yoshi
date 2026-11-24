import type { TFunction } from 'i18next'
import { toast } from 'sonner'

import { getErrorMessage } from '@/lib/api-error'
import { formatCurrency } from '@/lib/utils'

import type { BudgetAllocationShortfall } from './budget-allocation-shortfall'
import {
  type BudgetCoverDonor,
  type BudgetCoverPlan,
  executeBudgetCoverPlan,
  type PromptBudgetPulls,
  resolveBudgetCover
} from './budget-cover-plan'

type CoverMutations = Pick<
  Parameters<typeof executeBudgetCoverPlan>[0],
  'createAllocationAsync' | 'transferAllocationAsync'
>

/** Tells the user what was allocated for them, since nothing was asked. */
export function describeAutoAllocations(
  plan: BudgetCoverPlan,
  shortfalls: BudgetAllocationShortfall[]
): string {
  const nameById = new Map(
    shortfalls.map((item) => [
      item.budgetId,
      item.budgetName
    ])
  )
  return plan.allocations
    .map(
      (allocation) =>
        `${nameById.get(allocation.budgetId) ?? allocation.budgetId} ${formatCurrency(allocation.amount)}`
    )
    .join(', ')
}

/**
 * Covers the budgets an expense would overdraw, then saves it. While the
 * unallocated pool is enough this happens without asking; when the pool runs
 * out the user chooses which budgets to move the rest from.
 */
export async function submitExpenseWithOptionalAllocation(
  params: {
    shortfalls: BudgetAllocationShortfall[]
    unallocatedAmount: number
    /** Budgets with allocation to spare, offered when the pool runs out. */
    donors: BudgetCoverDonor[]
    userId?: string | null
    confirmLabel: string
    t: TFunction
    promptBudgetPulls: PromptBudgetPulls
    submitTransaction: () => Promise<void>
  } & CoverMutations
): Promise<boolean> {
  const {
    shortfalls,
    unallocatedAmount,
    donors,
    userId,
    confirmLabel,
    t,
    promptBudgetPulls,
    createAllocationAsync,
    transferAllocationAsync,
    submitTransaction
  } = params

  if (shortfalls.length > 0) {
    const cover = await resolveBudgetCover({
      shortfalls,
      poolAvailable: unallocatedAmount,
      donors,
      confirmLabel,
      promptPulls: promptBudgetPulls
    })

    if (!cover) {
      return false
    }

    try {
      await executeBudgetCoverPlan({
        plan: cover.plan,
        userId,
        createAllocationAsync,
        transferAllocationAsync
      })
    } catch (error) {
      toast.error(getErrorMessage(error))
      return false
    }

    if (!cover.asked) {
      toast.info(
        t('transactions.autoAllocated', {
          details: describeAutoAllocations(cover.plan, shortfalls)
        })
      )
    }
  }

  try {
    await submitTransaction()
    return true
  } catch (error) {
    toast.error(
      shortfalls.length > 0
        ? t('transactions.allocationAppliedSubmitFailed', {
            error: getErrorMessage(error)
          })
        : getErrorMessage(error)
    )
    return false
  }
}
