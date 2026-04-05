import { HttpResponse, http } from 'msw'
import {
  budgets,
  categories,
  nextId,
  nowIso,
  paginate,
  readJson,
  transactions
} from '../data'

const BASE = '/api/v1'

function enrichCategoryForList(
  householdId: string,
  c: (typeof categories)[number]
) {
  const transactionCount = transactions.filter(
    (tx) =>
      tx.householdId === householdId &&
      tx.categoryId === c.id &&
      (tx.type === 'EXPENSE' || tx.type === 'INCOME')
  ).length
  const budgetCount = budgets.filter(
    (b) => b.householdId === householdId && b.categoryIds.includes(c.id)
  ).length
  return {
    ...c,
    archived: c.archived ?? false,
    _count: {
      transactions: transactionCount,
      budgets: budgetCount
    }
  }
}

export const categoryHandlers = [
  http.get(
    `${BASE}/households/:householdId/categories`,
    ({ request, params }) => {
      const url = new URL(request.url)
      const type = url.searchParams.get('type')
      if (type && type !== 'INCOME' && type !== 'EXPENSE') {
        return HttpResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'type must be one of INCOME or EXPENSE'
            }
          },
          {
            status: 422
          }
        )
      }

      const budgetId = url.searchParams.get('budgetId')

      let filtered = categories.filter((item) => {
        if (item.householdId !== params.householdId) return false
        if (type && !item.types.includes(type)) return false
        return true
      })

      if (budgetId) {
        const budget = budgets.find(
          (b) =>
            b.id === budgetId && b.householdId === String(params.householdId)
        )
        const allowed = new Set(budget?.categoryIds ?? [])
        filtered = filtered.filter((c) => allowed.has(c.id))
      }

      const householdId = String(params.householdId)
      const enriched = filtered.map((c) =>
        enrichCategoryForList(householdId, c)
      )

      return HttpResponse.json(
        paginate(
          enriched,
          url.searchParams.get('limit'),
          url.searchParams.get('offset')
        )
      )
    }
  ),

  http.post(
    `${BASE}/households/:householdId/categories`,
    async ({ request, params }) => {
      const body = await readJson<{
        name?: string
        types?: string[]
      }>(request)
      const category = {
        id: nextId('cat'),
        householdId: String(params.householdId),
        name: body.name ?? 'New Category',
        types: body.types ?? [
          'EXPENSE'
        ],
        archived: false,
        createdAt: nowIso()
      }
      categories.push(category)
      return HttpResponse.json(category, {
        status: 201
      })
    }
  ),

  http.get(`${BASE}/categories/:categoryId`, ({ params }) => {
    const category = categories.find((item) => item.id === params.categoryId)
    if (!category) {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Category not found'
          }
        },
        {
          status: 404
        }
      )
    }
    return HttpResponse.json({
      ...category,
      archived: category.archived ?? false
    })
  }),

  http.patch(`${BASE}/categories/:categoryId`, async ({ params, request }) => {
    const index = categories.findIndex((item) => item.id === params.categoryId)
    if (index === -1) {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Category not found'
          }
        },
        {
          status: 404
        }
      )
    }
    const body = await readJson<Record<string, unknown>>(request)
    categories[index] = {
      ...categories[index],
      ...body
    }
    return HttpResponse.json(categories[index])
  }),

  http.patch(
    `${BASE}/categories/:categoryId/archive`,
    async ({ params, request }) => {
      const index = categories.findIndex(
        (item) => item.id === params.categoryId
      )
      if (index === -1) {
        return HttpResponse.json(
          {
            error: {
              code: 'NOT_FOUND',
              message: 'Category not found'
            }
          },
          {
            status: 404
          }
        )
      }
      const body = await readJson<{
        archived?: boolean
      }>(request)
      const archived =
        typeof body.archived === 'boolean'
          ? body.archived
          : !categories[index].archived
      categories[index] = {
        ...categories[index],
        archived
      }
      return HttpResponse.json(categories[index])
    }
  ),

  http.delete(`${BASE}/categories/:categoryId`, ({ params }) => {
    const index = categories.findIndex((item) => item.id === params.categoryId)
    if (index === -1) {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Category not found'
          }
        },
        {
          status: 404
        }
      )
    }
    categories.splice(index, 1)
    return HttpResponse.json({
      success: true
    })
  })
]
