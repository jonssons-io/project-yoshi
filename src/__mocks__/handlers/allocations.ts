import { HttpResponse, http } from 'msw'
import {
  allocations,
  budgets,
  categories,
  nextId,
  nowIso,
  paginate,
  readJson
} from '../data'

const BASE = '/api/v1'

export const allocationHandlers = [
  http.get(
    `${BASE}/households/:householdId/allocations/unallocated`,
    ({ params }) => {
      const householdBudgets = budgets.filter(
        (item) => item.householdId === params.householdId
      )
      const allocated = householdBudgets.reduce((sum, budget) => {
        const budgetAllocations = allocations.filter(
          (item) => item.budgetId === budget.id
        )
        return (
          sum +
          budgetAllocations.reduce(
            (budgetSum, item) => budgetSum + item.amount,
            0
          )
        )
      }, 0)
      const totalFunds = 5000
      return HttpResponse.json({
        householdId: params.householdId,
        totalFunds,
        totalAllocated: allocated,
        unallocated: Math.max(0, totalFunds - allocated)
      })
    }
  ),

  http.post(
    `${BASE}/budgets/:budgetId/allocations`,
    async ({ request, params }) => {
      const body =
        await readJson<
          Partial<{
            categoryId: string
            amount: number
          }>
        >(request)
      const timestamp = nowIso()
      const allocation = {
        id: nextId('alloc'),
        budgetId: String(params.budgetId),
        categoryId: body.categoryId ?? categories[0]?.id ?? 'cat_1',
        amount: body.amount ?? 0,
        date: timestamp,
        createdAt: timestamp
      }
      allocations.push(allocation)
      return HttpResponse.json(allocation, {
        status: 201
      })
    }
  ),

  http.get(`${BASE}/budgets/:budgetId/allocations`, ({ request, params }) => {
    const url = new URL(request.url)
    const filtered = allocations.filter(
      (item) => item.budgetId === params.budgetId
    )
    return HttpResponse.json(
      paginate(
        filtered,
        url.searchParams.get('limit'),
        url.searchParams.get('offset')
      )
    )
  }),

  http.post(`${BASE}/allocations/transfer`, async ({ request }) => {
    const body =
      await readJson<
        Partial<{
          fromBudgetId: string
          toBudgetId: string
          amount: number
        }>
      >(request)
    const amount = body.amount ?? 0
    const fromBudgetId = body.fromBudgetId
    const toBudgetId = body.toBudgetId
    const from = allocations.find((item) => item.budgetId === fromBudgetId)
    let to = allocations.find((item) => item.budgetId === toBudgetId)

    if (!from || !toBudgetId) {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Allocation not found'
          }
        },
        {
          status: 404
        }
      )
    }

    if (!to) {
      const timestamp = nowIso()
      to = {
        id: nextId('alloc'),
        budgetId: toBudgetId,
        categoryId: categories[0]?.id ?? 'cat_1',
        amount: 0,
        date: timestamp,
        createdAt: timestamp
      }
      allocations.push(to)
    }

    const transferTimestamp = nowIso()
    from.amount -= amount
    from.date = transferTimestamp
    to.amount += amount
    to.date = transferTimestamp

    return HttpResponse.json([
      from,
      to
    ])
  })
]
