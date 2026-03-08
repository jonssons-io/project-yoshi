import { HttpResponse, http } from 'msw'
import {
  accounts,
  billInstances,
  bills,
  budgets,
  categories,
  households,
  nextId,
  nowIso,
  paginate,
  readJson,
  recipients,
  transactions
} from '../data'

const BASE = '/api/v1'
const RECURRENCE_TYPES = new Set([
  'NONE',
  'WEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'YEARLY',
  'CUSTOM'
])

type BillRequestBody = Partial<{
  name: string
  recipientId: string
  newRecipientName: string
  accountId: string
  budgetId: string | null
  startDate: string
  recurrenceType: string
  customIntervalDays: number
  estimatedAmount: number
  endDate: string | null
  lastPaymentDate: string | null
  categoryId: string | null
  newCategoryName: string
  splits: Array<{
    subtitle: string
    amount: number
    categoryId?: string
    newCategoryName?: string
  }>
}>

type BillInstanceRequestBody = Partial<{
  updateType: 'INSTANCE' | 'FUTURE' | 'ALL'
  name: string
  recipient: string
  amount: number
  dueDate: string
  accountId: string
  categoryId: string
}>

function normalizeRecurrenceType(value?: string): string {
  if (!value) return 'MONTHLY'
  const normalized = value.toUpperCase()
  return RECURRENCE_TYPES.has(normalized) ? normalized : 'MONTHLY'
}

function toBillResponse(
  bill: Record<string, unknown>,
  budgetIdFallback?: string
): Record<string, unknown> {
  const estimatedAmount =
    typeof bill.estimatedAmount === 'number'
      ? bill.estimatedAmount
      : typeof bill.amount === 'number'
        ? bill.amount
        : 0
  const startDate =
    typeof bill.startDate === 'string'
      ? bill.startDate
      : typeof bill.createdAt === 'string'
        ? bill.createdAt.slice(0, 10)
        : nowIso().slice(0, 10)
  const recipient = recipients.find((item) => item.id === bill.recipientId)
  const account = accounts.find((item) => item.id === bill.accountId)
  const category =
    typeof bill.categoryId === 'string'
      ? categories.find((item) => item.id === bill.categoryId)
      : null
  const budgetId =
    typeof bill.budgetId === 'string'
      ? bill.budgetId
      : typeof budgetIdFallback === 'string'
        ? budgetIdFallback
        : null
  const budget = budgetId ? budgets.find((item) => item.id === budgetId) : null
  const householdId = getBillHouseholdId(bill)
  const household = householdId
    ? households.find((item) => item.id === householdId)
    : null

  const toRelationRef = (
    entity?: {
      id: string
      name?: string | null
    } | null
  ) =>
    entity
      ? {
          id: entity.id,
          name: entity.name ?? null
        }
      : null

  return {
    id: String(bill.id),
    name: String(bill.name ?? 'New Bill'),
    recipient: toRelationRef(recipient),
    account: toRelationRef(account),
    startDate,
    recurrenceType: normalizeRecurrenceType(
      typeof bill.recurrenceType === 'string' ? bill.recurrenceType : undefined
    ),
    customIntervalDays:
      typeof bill.customIntervalDays === 'number'
        ? bill.customIntervalDays
        : null,
    estimatedAmount,
    endDate: typeof bill.endDate === 'string' ? bill.endDate : null,
    lastPaymentDate:
      typeof bill.lastPaymentDate === 'string' ? bill.lastPaymentDate : null,
    category: toRelationRef(category),
    budget: toRelationRef(budget),
    household: toRelationRef(household),
    splits: Array.isArray(bill.splits) ? bill.splits : [],
    archived: Boolean(bill.archived),
    createdAt: String(bill.createdAt ?? nowIso())
  }
}

function enrichSplits(
  splits?: Array<{
    subtitle: string
    amount: number
    categoryId?: string | null
  }>
) {
  return (splits ?? []).map((split) => ({
    ...split,
    category: split.categoryId
      ? (categories.find((item) => item.id === split.categoryId) ?? null)
      : null
  }))
}

function enrichBillInstance(instance: (typeof billInstances)[number]) {
  const bill = bills.find((item) => item.id === instance.billId)
  const budget = instance.budgetId
    ? budgets.find((item) => item.id === instance.budgetId)
    : null
  const transaction = instance.transactionId
    ? transactions.find((item) => item.id === instance.transactionId)
    : null
  const toRelationRef = (
    entity?: {
      id: string
      name?: string | null
    } | null
  ) =>
    entity
      ? {
          id: entity.id,
          name: entity.name ?? null
        }
      : null

  return {
    id: instance.id,
    bill: toRelationRef(bill),
    name: instance.name,
    recipient: toRelationRef(
      recipients.find((item) => item.id === instance.recipientId)
    ),
    amount: instance.amount,
    paidAmount: null,
    dueDate: instance.dueDate,
    budget: toRelationRef(budget),
    status: instance.status,
    transaction: toRelationRef(transaction),
    account: toRelationRef(
      accounts.find((item) => item.id === instance.accountId)
    ),
    category: toRelationRef(
      instance.categoryId
        ? categories.find((item) => item.id === instance.categoryId)
        : null
    ),
    splits: enrichSplits(instance.splits).map((split, index) => ({
      id: `split_${instance.id}_${index + 1}`,
      billId: instance.billId,
      billInstanceId: instance.id,
      categoryId: split.categoryId ?? '',
      amount: split.amount,
      subtitle: split.subtitle,
      category: split.category
    })),
    recurrenceType: instance.recurrenceType,
    customIntervalDays: instance.customIntervalDays ?? null,
    startDate: instance.startDate,
    archived: instance.archived
  }
}

function getBudgetHouseholdId(budgetId?: string | null): string | undefined {
  if (!budgetId) return undefined
  return budgets.find((item) => item.id === budgetId)?.householdId
}

function getBillHouseholdId(bill: Record<string, unknown>): string | undefined {
  return typeof bill.householdId === 'string'
    ? bill.householdId
    : getBudgetHouseholdId(
        typeof bill.budgetId === 'string' ? bill.budgetId : null
      )
}

function getBillInstanceHouseholdId(
  instance: (typeof billInstances)[number]
): string | undefined {
  const bill = bills.find((item) => item.id === instance.billId)
  if (bill)
    return getBillHouseholdId(bill as unknown as Record<string, unknown>)
  return getBudgetHouseholdId(instance.budgetId)
}

export const billHandlers = [
  http.get(`${BASE}/bill-instances`, ({ request }) => {
    const url = new URL(request.url)
    const householdId = url.searchParams.get('householdId')
    const billId = url.searchParams.get('billId')
    const transactionId = url.searchParams.get('transactionId')
    const includeArchived = url.searchParams.get('includeArchived') === 'true'
    const dateFrom = url.searchParams.get('dateFrom')
    const dateTo = url.searchParams.get('dateTo')

    const filtered = billInstances.filter((item) => {
      if (!includeArchived && item.archived) return false
      if (householdId && getBillInstanceHouseholdId(item) !== householdId)
        return false
      if (billId && item.billId !== billId) return false
      if (transactionId && item.transactionId !== transactionId) return false
      if (
        dateFrom &&
        new Date(item.dueDate).getTime() < new Date(dateFrom).getTime()
      ) {
        return false
      }
      if (
        dateTo &&
        new Date(item.dueDate).getTime() > new Date(dateTo).getTime()
      ) {
        return false
      }
      return true
    })

    return HttpResponse.json(
      paginate(
        filtered.map(enrichBillInstance),
        url.searchParams.get('limit'),
        url.searchParams.get('offset')
      )
    )
  }),

  http.get(`${BASE}/households/:householdId/bills`, ({ request, params }) => {
    const url = new URL(request.url)
    const budgetId = url.searchParams.get('budgetId')
    const includeArchived = url.searchParams.get('includeArchived') === 'true'
    const filtered = bills.filter((item) => {
      if (
        getBillHouseholdId(item as unknown as Record<string, unknown>) !==
        params.householdId
      ) {
        return false
      }
      if (!includeArchived && item.archived) return false
      if (budgetId && item.budgetId !== budgetId) return false
      return true
    })

    return HttpResponse.json(
      paginate(
        filtered.map((bill) => toBillResponse(bill)),
        url.searchParams.get('limit'),
        url.searchParams.get('offset')
      )
    )
  }),

  http.post(
    `${BASE}/households/:householdId/bills`,
    async ({ request, params }) => {
      const body = await readJson<BillRequestBody>(request)
      const estimatedAmount = body.estimatedAmount ?? 0
      const startDate = body.startDate ?? nowIso().slice(0, 10)
      const createdRecipient = body.newRecipientName
        ? {
            id: nextId('rec'),
            householdId: String(params.householdId ?? 'hh_1'),
            name: body.newRecipientName,
            archived: false,
            createdAt: nowIso()
          }
        : null
      if (createdRecipient) {
        recipients.push(createdRecipient)
      }
      const bill = {
        id: nextId('bill'),
        householdId: String(params.householdId),
        budgetId: body.budgetId ?? '',
        name: body.name ?? 'New Bill',
        recipientId: body.recipientId ?? createdRecipient?.id ?? 'rec_1',
        accountId: body.accountId ?? 'acc_1',
        startDate,
        recurrenceType: normalizeRecurrenceType(body.recurrenceType),
        customIntervalDays: body.customIntervalDays ?? null,
        estimatedAmount,
        endDate: body.endDate ?? null,
        lastPaymentDate: body.lastPaymentDate ?? null,
        categoryId: body.categoryId ?? null,
        splits: body.splits?.map((split) => ({
          subtitle: split.subtitle,
          amount: split.amount,
          categoryId: split.categoryId ?? null
        })),
        archived: false,
        createdAt: nowIso()
      }
      bills.push(bill)
      const instance = {
        id: nextId('billinst'),
        householdId: bill.householdId,
        billId: bill.id,
        name: bill.name,
        recipientId: bill.recipientId,
        budgetId: bill.budgetId,
        amount: bill.estimatedAmount,
        dueDate: startDate,
        status: 'UPCOMING' as const,
        transactionId: null,
        accountId: bill.accountId,
        categoryId: bill.categoryId,
        recurrenceType: bill.recurrenceType,
        customIntervalDays: bill.customIntervalDays,
        startDate: bill.startDate,
        archived: bill.archived,
        splits: bill.splits
      }
      billInstances.push(instance)
      return HttpResponse.json(toBillResponse(bill), {
        status: 201
      })
    }
  ),

  http.patch(`${BASE}/bills/:billId`, async ({ params, request }) => {
    const index = bills.findIndex((item) => item.id === params.billId)
    if (index === -1) {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Bill not found'
          }
        },
        {
          status: 404
        }
      )
    }
    const body = await readJson<Record<string, unknown>>(request)
    bills[index] = {
      ...bills[index],
      ...body
    }
    return HttpResponse.json(toBillResponse(bills[index]))
  }),

  http.delete(`${BASE}/bills/:billId`, ({ params }) => {
    const billIndex = bills.findIndex((item) => item.id === params.billId)
    if (billIndex === -1) {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Bill not found'
          }
        },
        {
          status: 404
        }
      )
    }
    const billId = bills[billIndex].id
    bills.splice(billIndex, 1)

    for (let i = billInstances.length - 1; i >= 0; i -= 1) {
      if (billInstances[i].billId === billId) {
        billInstances.splice(i, 1)
      }
    }
    return HttpResponse.json({
      success: true
    })
  }),

  http.patch(`${BASE}/bills/:billId/archive`, async ({ params, request }) => {
    const index = bills.findIndex((item) => item.id === params.billId)
    if (index === -1) {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Bill not found'
          }
        },
        {
          status: 404
        }
      )
    }
    const body =
      await readJson<
        Partial<{
          archived: boolean
        }>
      >(request)
    const archived =
      typeof body.archived === 'boolean'
        ? body.archived
        : !bills[index].archived
    bills[index] = {
      ...bills[index],
      archived
    }
    return HttpResponse.json(toBillResponse(bills[index]))
  }),

  http.get(`${BASE}/bill-instances/:instanceId`, ({ params }) => {
    const instance = billInstances.find((item) => item.id === params.instanceId)
    if (!instance) {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Bill instance not found'
          }
        },
        {
          status: 404
        }
      )
    }
    return HttpResponse.json(enrichBillInstance(instance))
  }),

  http.patch(
    `${BASE}/bill-instances/:instanceId`,
    async ({ params, request }) => {
      const index = billInstances.findIndex(
        (item) => item.id === params.instanceId
      )
      if (index === -1) {
        return HttpResponse.json(
          {
            error: {
              code: 'NOT_FOUND',
              message: 'Bill instance not found'
            }
          },
          {
            status: 404
          }
        )
      }
      const body = await readJson<BillInstanceRequestBody>(request)
      const sourceInstance = billInstances[index]
      const updateType = body.updateType ?? 'INSTANCE'
      const targetIndexes = billInstances
        .map((item, itemIndex) => ({
          item,
          itemIndex
        }))
        .filter(({ item }) => {
          if (item.billId !== sourceInstance.billId) return false
          if (updateType === 'ALL') return true
          if (updateType === 'FUTURE') {
            return item.dueDate >= sourceInstance.dueDate
          }
          return item.id === sourceInstance.id
        })
        .map(({ itemIndex }) => itemIndex)

      const recipientId =
        body.recipient && body.recipient.length > 0
          ? (recipients.find((item) => item.name === body.recipient)?.id ??
            sourceInstance.recipientId)
          : sourceInstance.recipientId

      for (const targetIndex of targetIndexes) {
        billInstances[targetIndex] = {
          ...billInstances[targetIndex],
          name: body.name ?? billInstances[targetIndex].name,
          recipientId,
          amount:
            typeof body.amount === 'number'
              ? body.amount
              : billInstances[targetIndex].amount,
          dueDate:
            typeof body.dueDate === 'string'
              ? body.dueDate
              : billInstances[targetIndex].dueDate,
          accountId:
            typeof body.accountId === 'string'
              ? body.accountId
              : billInstances[targetIndex].accountId,
          categoryId:
            typeof body.categoryId === 'string'
              ? body.categoryId
              : billInstances[targetIndex].categoryId
        }
      }

      const billIndex = bills.findIndex(
        (item) => item.id === sourceInstance.billId
      )
      if (billIndex !== -1 && updateType !== 'INSTANCE') {
        bills[billIndex] = {
          ...bills[billIndex],
          name: body.name ?? bills[billIndex].name,
          recipientId,
          accountId:
            typeof body.accountId === 'string'
              ? body.accountId
              : bills[billIndex].accountId,
          categoryId:
            typeof body.categoryId === 'string'
              ? body.categoryId
              : bills[billIndex].categoryId,
          estimatedAmount:
            typeof body.amount === 'number'
              ? body.amount
              : bills[billIndex].estimatedAmount
        }
      }

      return HttpResponse.json(enrichBillInstance(billInstances[index]))
    }
  )
]
