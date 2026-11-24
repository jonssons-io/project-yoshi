import type { BulkCreateTransactionsResponse2 } from '@/api/generated/types.gen'
import { TransactionType } from '@/api/generated/types.gen'

import {
  type BudgetCoverPlan,
  executeBudgetCoverPlan
} from '@/drawers/drawers/create-transaction-drawer/budget-cover-plan'
import { buildBulkCreateRequest } from './build-bulk-create-request'
import type { TransactionDraft } from './types'

export type ImportBulkPhaseResult = {
  created: BulkCreateTransactionsResponse2['created']
  failed: BulkCreateTransactionsResponse2['failed']
}

export type ImportSubmitResult =
  | {
      ok: true
      incomeResult: ImportBulkPhaseResult | null
      finalResult: ImportBulkPhaseResult | null
    }
  | {
      ok: false
      phase: 'incomes' | 'allocations' | 'transfersAndExpenses'
      incomeResult?: ImportBulkPhaseResult
      allocationError?: unknown
      finalResult?: ImportBulkPhaseResult
    }

type BulkCreateAsync = (
  body: ReturnType<typeof buildBulkCreateRequest>
) => Promise<BulkCreateTransactionsResponse2>

type CoverMutations = Pick<
  Parameters<typeof executeBudgetCoverPlan>[0],
  'createAllocationAsync' | 'transferAllocationAsync'
>

function toPhaseResult(
  response: BulkCreateTransactionsResponse2
): ImportBulkPhaseResult {
  return {
    created: response.created,
    failed: response.failed
  }
}

/**
 * Import order: incomes → budget cover (allocations from the pool, then moves
 * between budgets) → transfers and expenses. Incomes go first because the
 * cover plan may count on them being in the unallocated pool.
 */
export async function submitImportInOrder(
  params: {
    drafts: TransactionDraft[]
    budgetCoverPlan: BudgetCoverPlan
    userId?: string | null
    bulkCreateAsync: BulkCreateAsync
  } & CoverMutations
): Promise<ImportSubmitResult> {
  const {
    drafts,
    budgetCoverPlan,
    userId,
    bulkCreateAsync,
    createAllocationAsync,
    transferAllocationAsync
  } = params

  const incomeBody = buildBulkCreateRequest(drafts, {
    types: [
      TransactionType.INCOME
    ]
  })

  let incomeResult: ImportBulkPhaseResult | null = null

  if (incomeBody.transactions.length > 0) {
    const response = await bulkCreateAsync(incomeBody)
    incomeResult = toPhaseResult(response)
    if (response.failed.length > 0) {
      return {
        ok: false,
        phase: 'incomes',
        incomeResult
      }
    }
  }

  if (
    budgetCoverPlan.allocations.length > 0 ||
    budgetCoverPlan.transfers.length > 0
  ) {
    try {
      await executeBudgetCoverPlan({
        plan: budgetCoverPlan,
        userId,
        createAllocationAsync,
        transferAllocationAsync
      })
    } catch (allocationError) {
      return {
        ok: false,
        phase: 'allocations',
        ...(incomeResult
          ? {
              incomeResult
            }
          : {}),
        allocationError
      }
    }
  }

  const transfersAndExpensesBody = buildBulkCreateRequest(drafts, {
    types: [
      TransactionType.TRANSFER,
      TransactionType.EXPENSE
    ]
  })

  if (transfersAndExpensesBody.transactions.length === 0) {
    return {
      ok: true,
      incomeResult,
      finalResult: null
    }
  }

  const response = await bulkCreateAsync(transfersAndExpensesBody)
  const finalResult = toPhaseResult(response)

  if (response.failed.length > 0) {
    return {
      ok: false,
      phase: 'transfersAndExpenses',
      ...(incomeResult
        ? {
            incomeResult
          }
        : {}),
      finalResult
    }
  }

  return {
    ok: true,
    incomeResult,
    finalResult
  }
}
