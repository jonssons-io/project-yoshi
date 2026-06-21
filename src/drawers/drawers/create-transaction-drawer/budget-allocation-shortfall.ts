import { isAfter, startOfDay } from 'date-fns'

type BudgetLike = {
  id: string
  name: string
  remainingAmount?: number
}

export type BudgetAllocationShortfall = {
  budgetId: string
  budgetName: string
  expenseAmount: number
  remainingAmount: number
  shortfall: number
}

export function isEffectiveTransactionDate(date: Date): boolean {
  return !isAfter(startOfDay(date), startOfDay(new Date()))
}

export function computeBudgetAllocationShortfalls(params: {
  budgets: BudgetLike[]
  expenseLines: Array<{
    budgetId: string
    amount: number
  }>
}): BudgetAllocationShortfall[] {
  const { budgets, expenseLines } = params
  const amountByBudgetId = new Map<string, number>()

  for (const line of expenseLines) {
    if (!line.budgetId) continue
    amountByBudgetId.set(
      line.budgetId,
      (amountByBudgetId.get(line.budgetId) ?? 0) + line.amount
    )
  }

  const budgetById = new Map(
    budgets.map((budget) => [
      budget.id,
      budget
    ])
  )
  const shortfalls: BudgetAllocationShortfall[] = []

  for (const [budgetId, expenseAmount] of amountByBudgetId) {
    const budget = budgetById.get(budgetId)
    if (!budget) continue

    const remainingAmount = budget.remainingAmount ?? 0
    const shortfall = Math.max(0, expenseAmount - remainingAmount)
    if (shortfall <= 0) continue

    shortfalls.push({
      budgetId,
      budgetName: budget.name,
      expenseAmount,
      remainingAmount,
      shortfall
    })
  }

  return shortfalls
}

export type ExpenseBudgetLine = {
  budgetId: string
  amount: number
}

function sumExpenseLinesByBudget(
  expenseLines: ExpenseBudgetLine[]
): Map<string, number> {
  const amountByBudgetId = new Map<string, number>()

  for (const line of expenseLines) {
    if (!line.budgetId) continue
    amountByBudgetId.set(
      line.budgetId,
      (amountByBudgetId.get(line.budgetId) ?? 0) + line.amount
    )
  }

  return amountByBudgetId
}

export function computeEditBudgetAllocationShortfalls(params: {
  budgets: BudgetLike[]
  originalExpenseLines: ExpenseBudgetLine[]
  newExpenseLines: ExpenseBudgetLine[]
}): BudgetAllocationShortfall[] {
  const { budgets, originalExpenseLines, newExpenseLines } = params
  const originalByBudgetId = sumExpenseLinesByBudget(originalExpenseLines)
  const newByBudgetId = sumExpenseLinesByBudget(newExpenseLines)
  const budgetById = new Map(
    budgets.map((budget) => [
      budget.id,
      budget
    ])
  )
  const shortfalls: BudgetAllocationShortfall[] = []

  const budgetIds = new Set([
    ...originalByBudgetId.keys(),
    ...newByBudgetId.keys()
  ])

  for (const budgetId of budgetIds) {
    const additionalNeed =
      (newByBudgetId.get(budgetId) ?? 0) -
      (originalByBudgetId.get(budgetId) ?? 0)
    if (additionalNeed <= 0) continue

    const budget = budgetById.get(budgetId)
    if (!budget) continue

    const remainingAmount = budget.remainingAmount ?? 0
    const shortfall = Math.max(0, additionalNeed - remainingAmount)
    if (shortfall <= 0) continue

    shortfalls.push({
      budgetId,
      budgetName: budget.name,
      expenseAmount: additionalNeed,
      remainingAmount,
      shortfall
    })
  }

  return shortfalls
}

export function resolveExpenseBudgetShortfalls(params: {
  mode: 'create' | 'edit'
  budgets: BudgetLike[]
  newExpenseLines: ExpenseBudgetLine[]
  newDate: Date
  originalExpenseLines?: ExpenseBudgetLine[]
  originalDate?: Date
}): BudgetAllocationShortfall[] {
  const {
    mode,
    budgets,
    newExpenseLines,
    newDate,
    originalExpenseLines = [],
    originalDate
  } = params

  if (!isEffectiveTransactionDate(newDate)) {
    return []
  }

  if (mode === 'create') {
    return computeBudgetAllocationShortfalls({
      budgets,
      expenseLines: newExpenseLines
    })
  }

  if (originalDate && isEffectiveTransactionDate(originalDate)) {
    return computeEditBudgetAllocationShortfalls({
      budgets,
      originalExpenseLines,
      newExpenseLines
    })
  }

  return computeBudgetAllocationShortfalls({
    budgets,
    expenseLines: newExpenseLines
  })
}

export function expenseLinesFromTransaction(params: {
  type: string
  amount: number
  budget?: {
    id?: string | null
  } | null
  splits?: Array<{
    amount: number
    budgetId?: string | null
    budget?: {
      id?: string | null
    } | null
  }> | null
}): ExpenseBudgetLine[] {
  const { type, amount, budget, splits } = params

  if (type !== 'EXPENSE') return []

  if (splits && splits.length > 0) {
    return splits.flatMap((row) => {
      const budgetId = row.budgetId ?? row.budget?.id
      if (!budgetId) return []
      return [
        {
          budgetId,
          amount: row.amount
        }
      ]
    })
  }

  const budgetId = budget?.id
  if (!budgetId) return []

  return [
    {
      budgetId,
      amount
    }
  ]
}

export function expenseLinesFromFormValues(params: {
  hasSplits: boolean
  amount: number | null
  budgetId?: string
  splits?: Array<{
    amount: number | null
    budgetId: string
  }>
}): ExpenseBudgetLine[] {
  const { hasSplits, amount, budgetId, splits } = params

  if (hasSplits && splits && splits.length > 0) {
    return splits.flatMap((row) => {
      if (row.amount == null || !row.budgetId) return []
      return [
        {
          budgetId: row.budgetId,
          amount: row.amount
        }
      ]
    })
  }

  if (amount == null || !budgetId) return []

  return [
    {
      budgetId,
      amount
    }
  ]
}
