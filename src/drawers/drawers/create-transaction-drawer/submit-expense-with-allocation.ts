import type { TFunction } from 'i18next'
import { toast } from 'sonner'

import type { BudgetAllocateOnDemandChoice } from '@/hooks/use-budget-allocate-on-demand-dialog'
import { getErrorMessage } from '@/lib/api-error'

import type { BudgetAllocationShortfall } from './budget-allocation-shortfall'

type CreateAllocationAsync = (variables: {
  budgetId: string
  amount: number
  userId?: string | null
}) => Promise<unknown>

type PromptAllocation = (params: {
  shortfalls: BudgetAllocationShortfall[]
  unallocatedAmount: number
  confirmLabel: string
}) => Promise<BudgetAllocateOnDemandChoice | null>

/**
 * Prompt for optional budget allocation, then run allocation (if chosen) before submit.
 */
export async function submitExpenseWithOptionalAllocation(params: {
  shortfalls: BudgetAllocationShortfall[]
  unallocatedAmount: number
  userId?: string | null
  confirmLabel: string
  t: TFunction
  promptAllocation: PromptAllocation
  createAllocationAsync: CreateAllocationAsync
  submitTransaction: () => Promise<void>
}): Promise<boolean> {
  const {
    shortfalls,
    unallocatedAmount,
    userId,
    confirmLabel,
    t,
    promptAllocation,
    createAllocationAsync,
    submitTransaction
  } = params

  if (shortfalls.length > 0) {
    const choice = await promptAllocation({
      shortfalls,
      unallocatedAmount,
      confirmLabel
    })

    if (!choice) {
      return false
    }

    try {
      await createAllocationAsync({
        budgetId: choice.budgetId,
        amount: choice.amount,
        userId
      })
    } catch (error) {
      toast.error(getErrorMessage(error))
      return false
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
