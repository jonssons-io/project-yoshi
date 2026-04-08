import { HttpResponse, http } from 'msw'
import {
  accounts,
  type Bill,
  billInstances,
  bills,
  budgets,
  categories,
  households,
  mockBillRevisions,
  nextId,
  nowIso,
  paginate,
  readJson,
  recipients,
  toUtcIsoDateTime,
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
  dueDate: string
  recurrenceType: string
  customIntervalDays: number
  estimatedAmount: number
  endDate: string | null
  lastPaymentDate: string | null
  paymentHandling: string | null
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
  name: string
  recipient: string
  newRecipientName: string
  amount: number
  dueDate: string
  accountId: string
  categoryId: string | null
  newCategoryName: string
  budgetId: string | null
  paymentHandling: string | null
  splits: Array<{
    subtitle: string
    amount: number
    categoryId?: string
    newCategoryName?: string
    budgetId?: string
  }>
}>

function normalizeRecurrenceType(value?: string): string {
  if (!value) return 'MONTHLY'
  const normalized = value.toUpperCase()
  return RECURRENCE_TYPES.has(normalized) ? normalized : 'MONTHLY'
}

function numberOfBillRevisions(bill: Record<string, unknown>): number {
  if (typeof bill.numberOfRevisions === 'number') return bill.numberOfRevisions
  const id = String(bill.id ?? '')
  const rows = mockBillRevisions.filter((row) => row.billId === id).length
  return Math.max(1, rows)
}

function normalizeBillPaymentHandling(
  value: string | null | undefined
): Bill['paymentHandling'] {
  if (value == null || typeof value !== 'string') return null
  const v = value.toUpperCase()
  switch (v) {
    case 'AUTOGIRO':
    case 'E_INVOICE':
    case 'MAIL':
    case 'PORTAL':
    case 'PAPER':
    case 'CARD':
      return v
    default:
      return null
  }
}

function createExpenseCategoryLinkedToAllBudgets(
  householdId: string,
  name: string
): string {
  const category = {
    id: nextId('cat'),
    householdId,
    name,
    types: [
      'EXPENSE'
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

function resolveBillInstanceRecipientFromPatch(
  householdId: string,
  fallbackRecipientId: string,
  body: BillInstanceRequestBody
): string {
  if (
    typeof body.newRecipientName === 'string' &&
    body.newRecipientName.trim().length > 0
  ) {
    const name = body.newRecipientName.trim()
    const existing = recipients.find(
      (r) =>
        r.householdId === householdId &&
        r.name.toLowerCase() === name.toLowerCase()
    )
    if (existing) return existing.id
    const created = {
      id: nextId('rec'),
      householdId,
      name,
      createdAt: nowIso()
    }
    recipients.push(created)
    return created.id
  }
  if (typeof body.recipient === 'string' && body.recipient.length > 0) {
    return body.recipient
  }
  return fallbackRecipientId
}

function normalizeBillInstanceDueDateForStorage(
  raw: string,
  fallback: string
): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  if (raw.length >= 10) return raw.slice(0, 10)
  return fallback
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
  const dueDateRaw =
    typeof bill.dueDate === 'string'
      ? bill.dueDate
      : typeof bill.createdAt === 'string'
        ? bill.createdAt.slice(0, 10)
        : nowIso().slice(0, 10)
  const dueDate = toUtcIsoDateTime(dueDateRaw)
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
    dueDate,
    recurrenceType: normalizeRecurrenceType(
      typeof bill.recurrenceType === 'string' ? bill.recurrenceType : undefined
    ),
    customIntervalDays:
      typeof bill.customIntervalDays === 'number'
        ? bill.customIntervalDays
        : null,
    estimatedAmount,
    endDate:
      typeof bill.endDate === 'string' ? toUtcIsoDateTime(bill.endDate) : null,
    lastPaymentDate:
      typeof bill.lastPaymentDate === 'string'
        ? toUtcIsoDateTime(bill.lastPaymentDate)
        : null,
    paymentHandling:
      typeof bill.paymentHandling === 'string' ? bill.paymentHandling : null,
    category: toRelationRef(category),
    budget: toRelationRef(budget),
    household: toRelationRef(household),
    splits: (() => {
      const raw = Array.isArray(bill.splits) ? bill.splits : []
      const defaultBudgetForLines =
        typeof bill.budgetId === 'string' && bill.budgetId.length > 0
          ? bill.budgetId
          : budgetId
      return enrichSplitsWithRelations(raw, defaultBudgetForLines).map(
        (split, index) => ({
          id: `split_${String(bill.id)}_${index + 1}`,
          billId: String(bill.id),
          billInstanceId: null,
          categoryId: split.categoryId ?? '',
          budgetId: split.budgetId,
          amount: split.amount,
          subtitle: split.subtitle,
          category: split.category,
          budget: split.budget
        })
      )
    })(),
    archived: Boolean(bill.archived),
    createdAt: String(bill.createdAt ?? nowIso()),
    numberOfRevisions: numberOfBillRevisions(bill)
  }
}

function enrichSplitsWithRelations(
  splits: Array<{
    subtitle: string
    amount: number
    categoryId?: string | null
    budgetId?: string | null
  }>,
  defaultBudgetId?: string | null
) {
  return splits.map((split) => {
    const effectiveBudgetId =
      typeof split.budgetId === 'string' && split.budgetId.length > 0
        ? split.budgetId
        : typeof defaultBudgetId === 'string' && defaultBudgetId.length > 0
          ? defaultBudgetId
          : null
    const categoryEntity = split.categoryId
      ? categories.find((item) => item.id === split.categoryId)
      : null
    const budgetEntity = effectiveBudgetId
      ? budgets.find((item) => item.id === effectiveBudgetId)
      : null
    return {
      subtitle: split.subtitle,
      amount: split.amount,
      categoryId: split.categoryId ?? null,
      budgetId: effectiveBudgetId,
      category: categoryEntity
        ? {
            id: categoryEntity.id,
            name: categoryEntity.name ?? null
          }
        : null,
      budget: budgetEntity
        ? {
            id: budgetEntity.id,
            name: budgetEntity.name ?? null
          }
        : null
    }
  })
}

function deriveBillInstanceStatus(
  instance: (typeof billInstances)[number]
): 'UPCOMING' | 'HANDLED' | 'OVERDUE' | 'PAID' {
  const hasTransaction = !!instance.transactionId
  const isPastOrPresent = new Date(instance.dueDate).getTime() <= Date.now()

  if (hasTransaction && isPastOrPresent) return 'PAID'
  if (hasTransaction) return 'HANDLED'
  if (isPastOrPresent) return 'OVERDUE'
  return 'UPCOMING'
}

function listFilteredBillInstances(url: URL) {
  const householdId = url.searchParams.get('householdId')
  const billId = url.searchParams.get('billId')
  const transactionId = url.searchParams.get('transactionId')
  const accountId = url.searchParams.get('accountId')
  const budgetId = url.searchParams.get('budgetId')
  const includeArchived = url.searchParams.get('includeArchived') === 'true'
  const dateFrom = url.searchParams.get('dateFrom')
  const dateTo = url.searchParams.get('dateTo')

  return billInstances.filter((item) => {
    if (!includeArchived && item.archived) return false
    if (householdId && getBillInstanceHouseholdId(item) !== householdId)
      return false
    if (billId && item.billId !== billId) return false
    if (transactionId && item.transactionId !== transactionId) return false
    if (accountId && item.accountId !== accountId) return false
    if (budgetId && item.budgetId !== budgetId) return false
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
}

function enrichBillInstance(instance: (typeof billInstances)[number]) {
  const bill = bills.find((item) => item.id === instance.billId)
  const paymentHandling =
    typeof instance.paymentHandling === 'string'
      ? instance.paymentHandling
      : (bill?.paymentHandling ?? null)
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
    dueDate: toUtcIsoDateTime(instance.dueDate),
    budget: toRelationRef(budget),
    status: deriveBillInstanceStatus(instance),
    transaction: toRelationRef(transaction),
    account: toRelationRef(
      accounts.find((item) => item.id === instance.accountId)
    ),
    category: toRelationRef(
      instance.categoryId
        ? categories.find((item) => item.id === instance.categoryId)
        : null
    ),
    splits: enrichSplitsWithRelations(
      instance.splits ?? [],
      instance.budgetId
    ).map((split, index) => ({
      id: `split_${instance.id}_${index + 1}`,
      billId: instance.billId,
      billInstanceId: instance.id,
      categoryId: split.categoryId ?? '',
      budgetId: split.budgetId,
      amount: split.amount,
      subtitle: split.subtitle,
      category: split.category,
      budget: split.budget
    })),
    recurrenceType: instance.recurrenceType,
    customIntervalDays: instance.customIntervalDays ?? null,
    paymentHandling,
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
  http.get(`${BASE}/bills/:billId/revisions`, ({ params }) => {
    const bill = bills.find((item) => item.id === params.billId)
    if (!bill) {
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
    const data = mockBillRevisions
      .filter((row) => row.billId === params.billId)
      .slice()
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    return HttpResponse.json({
      data
    })
  }),

  http.delete(`${BASE}/bills/:billId/revisions/:revisionId`, ({ params }) => {
    const bill = bills.find((item) => item.id === params.billId)
    if (!bill) {
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
    const idx = mockBillRevisions.findIndex(
      (row) => row.billId === params.billId && row.id === params.revisionId
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
    const row = mockBillRevisions[idx]
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
    mockBillRevisions.splice(idx, 1)
    return HttpResponse.json({
      success: true
    })
  }),

  http.get(`${BASE}/bills/:billId`, ({ params }) => {
    const bill = bills.find((item) => item.id === params.billId)
    if (!bill) {
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
    return HttpResponse.json(toBillResponse(bill))
  }),

  http.get(`${BASE}/bill-instances`, ({ request }) => {
    const url = new URL(request.url)
    const filtered = listFilteredBillInstances(url)

    return HttpResponse.json(
      paginate(
        filtered.map(enrichBillInstance),
        url.searchParams.get('limit'),
        url.searchParams.get('offset')
      )
    )
  }),

  http.get(`${BASE}/bill-instances/summary`, ({ request }) => {
    const url = new URL(request.url)
    const summary = listFilteredBillInstances(url).reduce(
      (acc, item) => {
        const status = deriveBillInstanceStatus(item)
        const amt = Number(item.amount ?? 0)
        if (status === 'UPCOMING') {
          acc.upcomingCount += 1
          acc.upcomingAmount += amt
        }
        if (status === 'HANDLED') {
          acc.handledCount += 1
          acc.handledAmount += amt
        }
        if (status === 'OVERDUE') {
          acc.overdueCount += 1
          acc.overdueAmount += amt
        }
        if (status === 'PAID') {
          acc.paidCount += 1
          acc.paidAmount += amt
        }
        return acc
      },
      {
        upcomingCount: 0,
        handledCount: 0,
        overdueCount: 0,
        paidCount: 0,
        upcomingAmount: 0,
        handledAmount: 0,
        overdueAmount: 0,
        paidAmount: 0
      }
    )

    return HttpResponse.json(summary)
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
      const dueDate = body.dueDate ?? nowIso().slice(0, 10)
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
        dueDate,
        recurrenceType: normalizeRecurrenceType(body.recurrenceType),
        customIntervalDays: body.customIntervalDays ?? null,
        estimatedAmount,
        endDate: body.endDate ?? null,
        lastPaymentDate: body.lastPaymentDate ?? null,
        paymentHandling: normalizeBillPaymentHandling(body.paymentHandling),
        categoryId: body.categoryId ?? null,
        splits: body.splits?.map((split) => ({
          subtitle: split.subtitle,
          amount: split.amount,
          categoryId: split.categoryId ?? null
        })),
        archived: false,
        createdAt: nowIso(),
        numberOfRevisions: 1
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
        dueDate,
        status: 'UPCOMING' as const,
        transactionId: null,
        accountId: bill.accountId,
        categoryId: bill.categoryId,
        recurrenceType: bill.recurrenceType,
        customIntervalDays: bill.customIntervalDays,
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
    const { updateScope: _us, fromDate: _fd, ...patch } = body
    const current = bills[index] as unknown as Record<string, unknown>
    bills[index] = {
      ...bills[index],
      ...patch,
      numberOfRevisions: numberOfBillRevisions(current) + 1
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
      const householdId = getBillInstanceHouseholdId(sourceInstance)
      if (!householdId) {
        return HttpResponse.json(
          {
            error: {
              code: 'INTERNAL',
              message: 'Could not resolve household for bill instance'
            }
          },
          {
            status: 500
          }
        )
      }

      const next: (typeof billInstances)[number] = {
        ...sourceInstance,
        name: typeof body.name === 'string' ? body.name : sourceInstance.name,
        recipientId: resolveBillInstanceRecipientFromPatch(
          householdId,
          sourceInstance.recipientId,
          body
        ),
        amount:
          typeof body.amount === 'number' ? body.amount : sourceInstance.amount,
        dueDate:
          typeof body.dueDate === 'string'
            ? normalizeBillInstanceDueDateForStorage(
                body.dueDate,
                sourceInstance.dueDate
              )
            : sourceInstance.dueDate,
        accountId:
          typeof body.accountId === 'string'
            ? body.accountId
            : sourceInstance.accountId
      }

      if (Object.hasOwn(body, 'paymentHandling')) {
        if (body.paymentHandling === null) {
          next.paymentHandling = null
        } else if (typeof body.paymentHandling === 'string') {
          next.paymentHandling = normalizeBillPaymentHandling(
            body.paymentHandling
          )
        }
      }

      if (body.splits !== undefined) {
        const lines = body.splits
        if (Array.isArray(lines) && lines.length === 0) {
          const bill = bills.find((b) => b.id === sourceInstance.billId)
          next.budgetId = bill?.budgetId ?? sourceInstance.budgetId
          next.categoryId = bill?.categoryId ?? null
          delete next.splits
        } else if (Array.isArray(lines) && lines.length > 0) {
          next.splits = lines.map((line) => {
            let categoryId: string | null | undefined = line.categoryId
            if (
              typeof line.newCategoryName === 'string' &&
              line.newCategoryName.trim().length > 0
            ) {
              categoryId = createExpenseCategoryLinkedToAllBudgets(
                householdId,
                line.newCategoryName.trim()
              )
            }
            return {
              subtitle: line.subtitle,
              amount: line.amount,
              categoryId: categoryId ?? null,
              ...(typeof line.budgetId === 'string'
                ? {
                    budgetId: line.budgetId
                  }
                : {})
            }
          })
          next.categoryId = null
          next.budgetId = ''
        }
      } else {
        if (
          typeof body.newCategoryName === 'string' &&
          body.newCategoryName.trim().length > 0
        ) {
          next.categoryId = createExpenseCategoryLinkedToAllBudgets(
            householdId,
            body.newCategoryName.trim()
          )
        } else if (Object.hasOwn(body, 'categoryId')) {
          if (body.categoryId === null) {
            next.categoryId = null
          } else if (typeof body.categoryId === 'string') {
            next.categoryId = body.categoryId
          }
        }
        if (Object.hasOwn(body, 'budgetId')) {
          if (body.budgetId === null) {
            next.budgetId = ''
          } else if (typeof body.budgetId === 'string') {
            next.budgetId = body.budgetId
          }
        }
      }

      billInstances[index] = next
      return HttpResponse.json(enrichBillInstance(billInstances[index]))
    }
  )
]
