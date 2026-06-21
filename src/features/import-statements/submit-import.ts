import type { BulkCreateTransactionsResponse2 } from '@/api/generated/types.gen'
import { TransactionType } from '@/api/generated/types.gen'

import { buildBulkCreateRequest } from './build-bulk-create-request'
import type { ImportAllocationChoice } from './components/import-allocation-dialog'
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

type CreateAllocationAsync = (variables: {
  budgetId: string
  amount: number
  userId?: string | null
}) => Promise<unknown>

function toPhaseResult(
  response: BulkCreateTransactionsResponse2
): ImportBulkPhaseResult {
  return {
    created: response.created,
    failed: response.failed
  }
}

/**
 * Import order: incomes → budget allocations → transfers and expenses.
 */
export async function submitImportInOrder(params: {
  drafts: TransactionDraft[]
  allocationChoices: ImportAllocationChoice[]
  userId?: string | null
  bulkCreateAsync: BulkCreateAsync
  createAllocationAsync: CreateAllocationAsync
}): Promise<ImportSubmitResult> {
  const {
    drafts,
    allocationChoices,
    userId,
    bulkCreateAsync,
    createAllocationAsync
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

  if (allocationChoices.length > 0) {
    try {
      await Promise.all(
        allocationChoices.map((choice) =>
          createAllocationAsync({
            budgetId: choice.budgetId,
            amount: choice.amount,
            userId
          })
        )
      )
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
