import { HttpResponse, http } from 'msw'
import {
  accounts,
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
  entity?: { id: string; name?: string | null } | null
) {
  return entity ? { id: entity.id, name: entity.name ?? null } : null
}

function deriveIncomeInstanceStatus(
  instance: (typeof incomeInstances)[number]
): 'UPCOMING' | 'HANDLED' | 'OVERDUE' | 'RECEIVED' {
  const hasTransaction = !!instance.transactionId
  const isPastOrPresent = new Date(instance.expectedDate).getTime() <= Date.now()

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
  hasRevisions: Boolean(income.hasRevisions ?? false),
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
        { status: 404 }
      )
    }
    const data = mockIncomeRevisions
      .filter((row) => row.incomeId === params.incomeId)
      .slice()
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    return HttpResponse.json({ data })
  }),

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
        hasRevisions: false
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
    incomes[index] = {
      ...incomes[index],
      ...body,
      estimatedAmount: amount,
      incomeSourceId:
        typeof body.incomeSourceId === 'string'
          ? body.incomeSourceId
          : (createdIncomeSource?.id ?? incomes[index].incomeSourceId),
      hasRevisions: true
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
      const updateType = body.updateType
      if (
        updateType !== 'INSTANCE' &&
        updateType !== 'FUTURE' &&
        updateType !== 'ALL'
      ) {
        return HttpResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'updateType is required (INSTANCE, FUTURE, or ALL)'
            }
          },
          { status: 400 }
        )
      }

      const source = incomeInstances[index]
      const targetIndexes: number[] = []
      for (let i = 0; i < incomeInstances.length; i += 1) {
        const item = incomeInstances[i]
        if (item.incomeId !== source.incomeId) continue
        if (updateType === 'INSTANCE') {
          if (item.id === source.id) targetIndexes.push(i)
          continue
        }
        if (item.transactionId) continue
        if (updateType === 'ALL') {
          targetIndexes.push(i)
          continue
        }
        if (
          updateType === 'FUTURE' &&
          item.expectedDate >= source.expectedDate
        ) {
          targetIndexes.push(i)
        }
      }

      const name = body.name
      const amount = body.amount
      const expectedDate = body.expectedDate
      const accountId = body.accountId
      const categoryId = body.categoryId

      for (const targetIndex of targetIndexes) {
        const current = incomeInstances[targetIndex]
        incomeInstances[targetIndex] = {
          ...current,
          ...(typeof name === 'string' ? { name } : {}),
          ...(typeof amount === 'number' ? { amount } : {}),
          ...(typeof expectedDate === 'string' ? { expectedDate } : {}),
          ...(typeof accountId === 'string' ? { accountId } : {}),
          ...(typeof categoryId === 'string' ? { categoryId } : {})
        }
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
      archived: !incomes[index].archived,
      hasRevisions: true
    }
    return HttpResponse.json(enrichIncome(incomes[index]))
  })
]
