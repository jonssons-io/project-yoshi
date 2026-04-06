import { HttpResponse, http } from 'msw'
import {
  accounts,
  budgets,
  categories,
  incomeInstances,
  incomeSources,
  incomes,
  mockIncomeRevisions,
  nextId,
  nowIso,
  paginate,
  readJson,
  toUtcIsoDateTime,
  transactions
} from '../data'

const BASE = '/api/v1'

function toRelationRef(
  entity?: {
    id: string
    name?: string | null
  } | null
) {
  return entity
    ? {
        id: entity.id,
        name: entity.name ?? null
      }
    : null
}

function deriveIncomeInstanceStatus(
  instance: (typeof incomeInstances)[number]
): 'UPCOMING' | 'HANDLED' | 'OVERDUE' | 'RECEIVED' {
  const hasTransaction = !!instance.transactionId
  const isPastOrPresent =
    new Date(instance.expectedDate).getTime() <= Date.now()

  if (hasTransaction && isPastOrPresent) return 'RECEIVED'
  if (hasTransaction) return 'HANDLED'
  if (isPastOrPresent) return 'OVERDUE'
  return 'UPCOMING'
}

function listFilteredIncomeInstances(url: URL) {
  const householdId = url.searchParams.get('householdId')
  const incomeId = url.searchParams.get('incomeId')
  const transactionId = url.searchParams.get('transactionId')
  const includeArchived = url.searchParams.get('includeArchived') === 'true'
  const dateFrom = url.searchParams.get('dateFrom')
  const dateTo = url.searchParams.get('dateTo')
  const accountId = url.searchParams.get('accountId')
  const categoryId = url.searchParams.get('categoryId')

  return incomeInstances.filter((item) => {
    const parentIncome = incomes.find((i) => i.id === item.incomeId)
    if (!includeArchived && parentIncome?.archived) return false
    if (householdId && item.householdId !== householdId) return false
    if (incomeId && item.incomeId !== incomeId) return false
    if (transactionId && item.transactionId !== transactionId) return false
    if (accountId && item.accountId !== accountId) return false
    if (categoryId && item.categoryId !== categoryId) return false
    if (
      dateFrom &&
      new Date(item.expectedDate).getTime() < new Date(dateFrom).getTime()
    ) {
      return false
    }
    if (
      dateTo &&
      new Date(item.expectedDate).getTime() > new Date(dateTo).getTime()
    ) {
      return false
    }
    return true
  })
}

function numberOfIncomeRevisions(income: (typeof incomes)[number]): number {
  if (typeof income.numberOfRevisions === 'number')
    return income.numberOfRevisions
  const rows = mockIncomeRevisions.filter(
    (row) => row.incomeId === String(income.id)
  ).length
  return Math.max(1, rows)
}

function createIncomeCategoryLinkedToAllBudgets(
  householdId: string,
  name: string
): string {
  const category = {
    id: nextId('cat'),
    householdId,
    name,
    types: [
      'INCOME'
    ],
    archived: false,
    createdAt: nowIso()
  }
  categories.push(category)
  for (const b of budgets) {
    if (b.householdId === householdId && !b.categoryIds.includes(category.id)) {
      b.categoryIds = [
        ...b.categoryIds,
        category.id
      ]
    }
  }
  return category.id
}

function normalizeIncomeInstanceExpectedDateForStorage(
  raw: string,
  fallback: string
): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  if (raw.length >= 10) return raw.slice(0, 10)
  return fallback
}

function enrichIncomeInstance(instance: (typeof incomeInstances)[number]) {
  const transaction = instance.transactionId
    ? transactions.find((item) => item.id === instance.transactionId)
    : null

  return {
    ...instance,
    expectedDate: toUtcIsoDateTime(instance.expectedDate),
    status: deriveIncomeInstanceStatus(instance),
    transaction: toRelationRef(transaction)
  }
}

const enrichIncome = (income: (typeof incomes)[number]) => ({
  ...income,
  expectedDate: toUtcIsoDateTime(income.expectedDate),
  endDate: income.endDate ? toUtcIsoDateTime(income.endDate) : null,
  numberOfRevisions: numberOfIncomeRevisions(income),
  account: accounts.find((item) => item.id === income.accountId),
  category: categories.find((item) => item.id === income.categoryId),
  incomeSource: incomeSources.find((item) => item.id === income.incomeSourceId)
})

export const incomeHandlers = [
  http.get(`${BASE}/incomes/:incomeId/revisions`, ({ params }) => {
    const income = incomes.find((item) => item.id === params.incomeId)
    if (!income) {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Income not found'
          }
        },
        {
          status: 404
        }
      )
    }
    const data = mockIncomeRevisions
      .filter((row) => row.incomeId === params.incomeId)
      .slice()
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    return HttpResponse.json({
      data
    })
  }),

  http.delete(
    `${BASE}/incomes/:incomeId/revisions/:revisionId`,
    ({ params }) => {
      const income = incomes.find((item) => item.id === params.incomeId)
      if (!income) {
        return HttpResponse.json(
          {
            error: {
              code: 'NOT_FOUND',
              message: 'Income not found'
            }
          },
          {
            status: 404
          }
        )
      }
      const idx = mockIncomeRevisions.findIndex(
        (row) =>
          row.incomeId === params.incomeId && row.id === params.revisionId
      )
      if (idx === -1) {
        return HttpResponse.json(
          {
            error: {
              code: 'NOT_FOUND',
              message: 'Revision not found'
            }
          },
          {
            status: 404
          }
        )
      }
      const row = mockIncomeRevisions[idx]
      if (row.scheduled !== true) {
        return HttpResponse.json(
          {
            error: {
              code: 'NOT_FOUND',
              message: 'Revision not found'
            }
          },
          {
            status: 404
          }
        )
      }
      mockIncomeRevisions.splice(idx, 1)
      return HttpResponse.json({
        success: true
      })
    }
  ),

  http.get(`${BASE}/households/:householdId/incomes`, ({ request, params }) => {
    const url = new URL(request.url)
    const filtered = incomes.filter(
      (item) => item.householdId === params.householdId
    )
    return HttpResponse.json(
      paginate(
        filtered.map(enrichIncome),
        url.searchParams.get('limit'),
        url.searchParams.get('offset')
      )
    )
  }),

  http.post(
    `${BASE}/households/:householdId/incomes`,
    async ({ request, params }) => {
      const body =
        await readJson<
          Partial<{
            name: string
            accountId: string
            categoryId: string
            incomeSourceId: string
            newIncomeSourceName: string
            amount: number
            expectedDate: string
            recurrenceType: string
            customIntervalDays: number
            endDate: string
          }>
        >(request)
      const createdIncomeSource =
        body.newIncomeSourceName && params.householdId
          ? {
              id: nextId('isrc'),
              householdId: String(params.householdId),
              name: body.newIncomeSourceName,
              createdAt: nowIso()
            }
          : null
      if (createdIncomeSource) {
        incomeSources.push(createdIncomeSource)
      }

      const income = {
        id: nextId('income'),
        name: body.name ?? 'Income',
        householdId: String(params.householdId),
        incomeSourceId:
          body.incomeSourceId ??
          createdIncomeSource?.id ??
          incomeSources[0]?.id ??
          'isrc_1',
        accountId: body.accountId ?? 'acc_1',
        categoryId: body.categoryId ?? 'cat_2',
        estimatedAmount: body.amount ?? 0,
        expectedDate: body.expectedDate ?? nowIso().slice(0, 10),
        recurrenceType: body.recurrenceType ?? 'MONTHLY',
        customIntervalDays: body.customIntervalDays,
        endDate: body.endDate ?? null,
        archived: false,
        createdAt: nowIso(),
        numberOfRevisions: 1
      }
      incomes.push(income)
      return HttpResponse.json(enrichIncome(income), {
        status: 201
      })
    }
  ),

  http.get(`${BASE}/income-instances`, ({ request }) => {
    const url = new URL(request.url)
    const filtered = listFilteredIncomeInstances(url)

    return HttpResponse.json(
      paginate(
        filtered.map(enrichIncomeInstance),
        url.searchParams.get('limit'),
        url.searchParams.get('offset')
      )
    )
  }),

  http.get(`${BASE}/income-instances/summary`, ({ request }) => {
    const url = new URL(request.url)
    const summary = listFilteredIncomeInstances(url).reduce(
      (acc, item) => {
        const status = deriveIncomeInstanceStatus(item)
        if (status === 'UPCOMING') acc.upcomingCount += 1
        if (status === 'HANDLED') acc.handledCount += 1
        if (status === 'OVERDUE') acc.overdueCount += 1
        if (status === 'RECEIVED') acc.receivedCount += 1
        return acc
      },
      {
        upcomingCount: 0,
        handledCount: 0,
        overdueCount: 0,
        receivedCount: 0
      }
    )

    return HttpResponse.json(summary)
  }),

  http.get(`${BASE}/incomes/:incomeId/instances`, ({ request, params }) => {
    const url = new URL(request.url)
    const filtered = incomeInstances.filter(
      (item) => item.incomeId === params.incomeId
    )
    return HttpResponse.json(
      paginate(
        filtered.map(enrichIncomeInstance),
        url.searchParams.get('limit'),
        url.searchParams.get('offset')
      )
    )
  }),

  http.get(`${BASE}/incomes/:incomeId`, ({ params }) => {
    const income = incomes.find((item) => item.id === params.incomeId)
    if (!income) {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Income not found'
          }
        },
        {
          status: 404
        }
      )
    }
    return HttpResponse.json(enrichIncome(income))
  }),

  http.get(`${BASE}/income-instances/:instanceId`, ({ params }) => {
    const instance = incomeInstances.find(
      (item) => item.id === params.instanceId
    )
    if (!instance) {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Income instance not found'
          }
        },
        {
          status: 404
        }
      )
    }
    return HttpResponse.json(enrichIncomeInstance(instance))
  }),

  http.patch(`${BASE}/incomes/:incomeId`, async ({ params, request }) => {
    const index = incomes.findIndex((item) => item.id === params.incomeId)
    if (index === -1) {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Income not found'
          }
        },
        {
          status: 404
        }
      )
    }
    const body = await readJson<Record<string, unknown>>(request)
    const { updateScope: _us, fromDate: _fd, ...patchBody } = body
    const createdIncomeSource =
      typeof body.newIncomeSourceName === 'string' &&
      body.newIncomeSourceName.length > 0
        ? {
            id: nextId('isrc'),
            householdId: incomes[index].householdId,
            name: body.newIncomeSourceName,
            createdAt: nowIso()
          }
        : null
    if (createdIncomeSource) {
      incomeSources.push(createdIncomeSource)
    }

    const amount =
      typeof body.amount === 'number'
        ? body.amount
        : incomes[index].estimatedAmount
    const current = incomes[index]
    incomes[index] = {
      ...current,
      ...patchBody,
      estimatedAmount: amount,
      incomeSourceId:
        typeof body.incomeSourceId === 'string'
          ? body.incomeSourceId
          : (createdIncomeSource?.id ?? current.incomeSourceId),
      numberOfRevisions: numberOfIncomeRevisions(current) + 1
    }
    return HttpResponse.json(enrichIncome(incomes[index]))
  }),

  http.patch(
    `${BASE}/income-instances/:instanceId`,
    async ({ params, request }) => {
      const index = incomeInstances.findIndex(
        (item) => item.id === params.instanceId
      )
      if (index === -1) {
        return HttpResponse.json(
          {
            error: {
              code: 'NOT_FOUND',
              message: 'Income instance not found'
            }
          },
          {
            status: 404
          }
        )
      }
      const body = await readJson<Record<string, unknown>>(request)
      const current = incomeInstances[index]

      let incomeSourceId = current.incomeSourceId
      if (
        typeof body.newIncomeSourceName === 'string' &&
        body.newIncomeSourceName.trim().length > 0
      ) {
        const created = {
          id: nextId('isrc'),
          householdId: current.householdId,
          name: body.newIncomeSourceName.trim(),
          createdAt: nowIso()
        }
        incomeSources.push(created)
        incomeSourceId = created.id
      } else if (
        typeof body.incomeSourceId === 'string' &&
        body.incomeSourceId.length > 0
      ) {
        incomeSourceId = body.incomeSourceId
      }

      let categoryId: string | null | undefined = current.categoryId
      if (
        typeof body.newCategoryName === 'string' &&
        body.newCategoryName.trim().length > 0
      ) {
        categoryId = createIncomeCategoryLinkedToAllBudgets(
          current.householdId,
          body.newCategoryName.trim()
        )
      } else if (Object.hasOwn(body, 'categoryId')) {
        if (body.categoryId === null) {
          categoryId = null
        } else if (typeof body.categoryId === 'string') {
          categoryId = body.categoryId
        }
      }

      const name = typeof body.name === 'string' ? body.name : current.name
      const amount =
        typeof body.amount === 'number' ? body.amount : current.amount
      const expectedDate =
        typeof body.expectedDate === 'string'
          ? normalizeIncomeInstanceExpectedDateForStorage(
              body.expectedDate,
              current.expectedDate
            )
          : current.expectedDate
      const accountId =
        typeof body.accountId === 'string' ? body.accountId : current.accountId

      incomeInstances[index] = {
        ...current,
        name,
        amount,
        expectedDate,
        accountId,
        categoryId,
        incomeSourceId
      }

      return HttpResponse.json(enrichIncomeInstance(incomeInstances[index]))
    }
  ),

  http.delete(`${BASE}/incomes/:incomeId`, ({ params }) => {
    const index = incomes.findIndex((item) => item.id === params.incomeId)
    if (index === -1) {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Income not found'
          }
        },
        {
          status: 404
        }
      )
    }
    incomes.splice(index, 1)
    return HttpResponse.json({
      success: true
    })
  }),

  http.patch(`${BASE}/incomes/:incomeId/archive`, ({ params }) => {
    const index = incomes.findIndex((item) => item.id === params.incomeId)
    if (index === -1) {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Income not found'
          }
        },
        {
          status: 404
        }
      )
    }
    incomes[index] = {
      ...incomes[index],
      archived: !incomes[index].archived
    }
    return HttpResponse.json(enrichIncome(incomes[index]))
  })
]
