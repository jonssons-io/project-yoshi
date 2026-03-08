import { HttpResponse, http } from 'msw'
import {
  accounts,
  allocations,
  budgets,
  categories,
  nextId,
  nowIso,
  paginate,
  readJson,
  transactions
} from '../data'

const BASE = '/api/v1'

function withBudgetMetrics<T extends (typeof budgets)[number]>(budget: T) {
  const allocatedAmount = allocations
    .filter((allocation) => allocation.budgetId === budget.id)
    .reduce((sum, allocation) => sum + allocation.amount, 0)

  const spentAmount = transactions
    .filter(
      (transaction) =>
        transaction.budgetId === budget.id &&
        transaction.type === 'EXPENSE' &&
        transaction.status === 'EFFECTIVE'
    )
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0)

  const remainingAmount = allocatedAmount - spentAmount
  const isOverdrafted = remainingAmount < 0

  return {
    ...budget,
    allocatedAmount,
    spentAmount,
    remainingAmount,
    isOverdrafted,
    overdraftAmount: isOverdrafted ? Math.abs(remainingAmount) : 0
  }
}

export const budgetHandlers = [
  http.get(`${BASE}/households/:householdId/budgets`, ({ request, params }) => {
    const url = new URL(request.url)
    const filtered = budgets.filter(
      (item) => item.householdId === params.householdId
    )
    return HttpResponse.json(
      paginate(
        filtered.map(withBudgetMetrics),
        url.searchParams.get('limit'),
        url.searchParams.get('offset')
      )
    )
  }),

  http.post(
    `${BASE}/households/:householdId/budgets`,
    async ({ request, params }) => {
      const body = await readJson<{
        name?: string
        startDate?: string
        endDate?: string | null
      }>(request)
      const budget = {
        id: nextId('budget'),
        householdId: String(params.householdId),
        name: body.name ?? 'New Budget',
        startDate: body.startDate ?? '2026-01-01',
        endDate: body.endDate ?? null,
        archived: false,
        categoryIds: [],
        accountIds: [],
        createdAt: nowIso()
      }
      budgets.push(budget)
      return HttpResponse.json(withBudgetMetrics(budget), {
        status: 201
      })
    }
  ),

  http.get(`${BASE}/budgets/:budgetId`, ({ params }) => {
    const budget = budgets.find((item) => item.id === params.budgetId)
    if (!budget) {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Budget not found'
          }
        },
        {
          status: 404
        }
      )
    }
    return HttpResponse.json({
      ...withBudgetMetrics(budget),
      categories: categories.filter((item) =>
        budget.categoryIds.includes(item.id)
      ),
      accounts: accounts.filter((item) => budget.accountIds.includes(item.id))
    })
  }),

  http.patch(`${BASE}/budgets/:budgetId`, async ({ request, params }) => {
    const index = budgets.findIndex((item) => item.id === params.budgetId)
    if (index === -1) {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Budget not found'
          }
        },
        {
          status: 404
        }
      )
    }
    const body = await readJson<Record<string, unknown>>(request)
    budgets[index] = {
      ...budgets[index],
      ...body
    }
    return HttpResponse.json(withBudgetMetrics(budgets[index]))
  }),

  http.delete(`${BASE}/budgets/:budgetId`, ({ params }) => {
    const index = budgets.findIndex((item) => item.id === params.budgetId)
    if (index === -1) {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Budget not found'
          }
        },
        {
          status: 404
        }
      )
    }
    budgets.splice(index, 1)
    return HttpResponse.json({
      success: true
    })
  }),

  http.put(`${BASE}/budgets/:budgetId/categories/:categoryId`, ({ params }) => {
    const budget = budgets.find((item) => item.id === params.budgetId)
    if (!budget) {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Budget not found'
          }
        },
        {
          status: 404
        }
      )
    }
    const categoryId = String(params.categoryId)
    if (!budget.categoryIds.includes(categoryId)) {
      budget.categoryIds.push(categoryId)
    }
    return HttpResponse.json(withBudgetMetrics(budget))
  }),

  http.delete(
    `${BASE}/budgets/:budgetId/categories/:categoryId`,
    ({ params }) => {
      const budget = budgets.find((item) => item.id === params.budgetId)
      if (!budget) {
        return HttpResponse.json(
          {
            error: {
              code: 'NOT_FOUND',
              message: 'Budget not found'
            }
          },
          {
            status: 404
          }
        )
      }
      budget.categoryIds = budget.categoryIds.filter(
        (item) => item !== params.categoryId
      )
      return HttpResponse.json(withBudgetMetrics(budget))
    }
  ),

  http.put(`${BASE}/budgets/:budgetId/accounts/:accountId`, ({ params }) => {
    const budget = budgets.find((item) => item.id === params.budgetId)
    if (!budget) {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Budget not found'
          }
        },
        {
          status: 404
        }
      )
    }
    const accountId = String(params.accountId)
    if (!budget.accountIds.includes(accountId)) {
      budget.accountIds.push(accountId)
    }
    return HttpResponse.json(withBudgetMetrics(budget))
  }),

  http.delete(`${BASE}/budgets/:budgetId/accounts/:accountId`, ({ params }) => {
    const budget = budgets.find((item) => item.id === params.budgetId)
    if (!budget) {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Budget not found'
          }
        },
        {
          status: 404
        }
      )
    }
    budget.accountIds = budget.accountIds.filter(
      (item) => item !== params.accountId
    )
    return HttpResponse.json(withBudgetMetrics(budget))
  }),

  http.get(`${BASE}/budgets/:budgetId/snapshot-history`, ({ params }) => {
    const budget = budgets.find((item) => item.id === params.budgetId)
    if (!budget) {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Budget not found'
          }
        },
        {
          status: 404
        }
      )
    }
    return HttpResponse.json({
      budgetId: budget.id,
      history: [
        {
          date: '2026-01-01',
          balance: 0
        },
        {
          date: '2026-01-15',
          balance: 1200
        },
        {
          date: '2026-01-31',
          balance: 980
        }
      ]
    })
  })
]
