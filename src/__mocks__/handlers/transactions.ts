import { HttpResponse, http } from 'msw'
import {
  accounts,
  billInstances,
  bills,
  budgets,
  categories,
  households,
  incomeInstances,
  incomeSources,
  incomes,
  nextId,
  nowIso,
  paginate,
  readJson,
  recipients,
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

const enrichTransaction = (transaction: (typeof transactions)[number]) => {
  const household = households.find(
    (item) => item.id === transaction.householdId
  )
  const account = accounts.find((item) => item.id === transaction.accountId)
  const category = transaction.categoryId
    ? categories.find((item) => item.id === transaction.categoryId)
    : null
  const recipient = transaction.recipientId
    ? recipients.find((item) => item.id === transaction.recipientId)
    : null
  const budget = transaction.budgetId
    ? budgets.find((item) => item.id === transaction.budgetId)
    : null
  const transferToAccount = transaction.transferToAccountId
    ? accounts.find((item) => item.id === transaction.transferToAccountId)
    : null
  const billInstance =
    (transaction.instanceId
      ? billInstances.find((item) => item.id === transaction.instanceId)
      : undefined) ??
    billInstances.find((item) => item.transactionId === transaction.id)
  const incomeInstance =
    (transaction.instanceId
      ? incomeInstances.find((item) => item.id === transaction.instanceId)
      : undefined) ??
    incomeInstances.find((item) => item.transactionId === transaction.id)
  const bill = billInstance?.billId
    ? bills.find((item) => item.id === billInstance.billId)
    : null
  const income = incomeInstance?.incomeId
    ? incomes.find((item) => item.id === incomeInstance.incomeId)
    : null
  const incomeSourceId =
    incomeInstance?.incomeSourceId ?? income?.incomeSourceId ?? null
  const incomeSource = incomeSourceId
    ? incomeSources.find((item) => item.id === incomeSourceId)
    : null

  return {
    id: transaction.id,
    name: transaction.name,
    amount: transaction.amount,
    date: toUtcIsoDateTime(transaction.date),
    type: transaction.type,
    status: transaction.status,
    notes: transaction.notes ?? null,
    household: toRelationRef(household),
    account: toRelationRef(account),
    category: toRelationRef(category),
    transferToAccount: toRelationRef(transferToAccount),
    budget: toRelationRef(budget),
    billInstance: toRelationRef(
      billInstance
        ? {
            id: billInstance.id,
            name: billInstance.name
          }
        : null
    ),
    bill: toRelationRef(bill),
    incomeInstance: toRelationRef(
      incomeInstance
        ? {
            id: incomeInstance.id,
            name: incomeInstance.name
          }
        : null
    ),
    income: toRelationRef(income),
    incomeSource: toRelationRef(incomeSource),
    recipient: toRelationRef(recipient),
    createdAt: transaction.createdAt,
    splits: transaction.splits
  }
}

function listFilteredTransactions(url: URL) {
  const householdId = url.searchParams.get('householdId')
  const budgetId = url.searchParams.get('budgetId')
  const accountId = url.searchParams.get('accountId')
  const categoryId = url.searchParams.get('categoryId')
  const type = url.searchParams.get('type')
  const billInstanceId = url.searchParams.get('billInstanceId')
  const incomeInstanceId = url.searchParams.get('incomeInstanceId')
  const dateFrom = url.searchParams.get('dateFrom')
  const dateTo = url.searchParams.get('dateTo')

  return transactions.filter((item) => {
    if (householdId && item.householdId !== householdId) return false
    if (budgetId && item.budgetId !== budgetId) return false
    if (accountId && item.accountId !== accountId) return false
    if (categoryId && item.categoryId !== categoryId) return false
    if (type && item.type !== type) return false
    if (billInstanceId && item.instanceId !== billInstanceId) return false
    if (incomeInstanceId) {
      const inst = incomeInstances.find((row) => row.id === incomeInstanceId)
      if (!inst?.transactionId || item.id !== inst.transactionId) return false
    }
    if (dateFrom && new Date(item.date).getTime() < new Date(dateFrom).getTime()) {
      return false
    }
    if (dateTo && new Date(item.date).getTime() > new Date(dateTo).getTime()) {
      return false
    }
    return true
  })
}

export const transactionHandlers = [
  http.get(`${BASE}/transactions`, ({ request }) => {
    const url = new URL(request.url)
    const filtered = listFilteredTransactions(url)
    return HttpResponse.json(
      paginate(
        filtered.map(enrichTransaction),
        url.searchParams.get('limit'),
        url.searchParams.get('offset')
      )
    )
  }),

  http.get(`${BASE}/transactions/summary`, ({ request }) => {
    const url = new URL(request.url)
    const filtered = listFilteredTransactions(url)
    const summary = filtered.reduce(
      (acc, item) => {
        if (item.type === 'INCOME') acc.totalIncome += item.amount
        if (item.type === 'EXPENSE') acc.totalExpense += item.amount
        acc.transactionCount += 1
        return acc
      },
      {
        dateFrom: url.searchParams.get('dateFrom') ?? '',
        dateTo: url.searchParams.get('dateTo') ?? '',
        totalIncome: 0,
        totalExpense: 0,
        net: 0,
        transactionCount: 0
      }
    )
    summary.net = summary.totalIncome - summary.totalExpense

    return HttpResponse.json(summary)
  }),

  http.get(`${BASE}/transactions/grouped-by-category`, ({ request }) => {
    const url = new URL(request.url)
    const budgetId = url.searchParams.get('budgetId')
    const filtered = transactions.filter((item) =>
      budgetId ? item.budgetId === budgetId : true
    )
    const grouped = filtered.reduce<Record<string, number>>((acc, item) => {
      const categoryName =
        categories.find((category) => category.id === item.categoryId)?.name ??
        'Uncategorized'
      acc[categoryName] = (acc[categoryName] ?? 0) + item.amount
      return acc
    }, {})
    return HttpResponse.json(
      Object.entries(grouped).map(([name, total]) => ({
        name,
        total
      }))
    )
  }),

  http.post(`${BASE}/transactions`, async ({ request }) => {
    const body =
      await readJson<
        Partial<{
          type: 'EXPENSE' | 'INCOME' | 'TRANSFER'
          name: string
          budgetId: string
          accountId: string
          categoryId: string
          newCategory: {
            name: string
            type: 'EXPENSE' | 'INCOME' | 'TRANSFER'
          }
          recipientId: string
          newRecipientName: string
          transferToAccountId: string
          instanceId: string
          splits: Array<{
            subtitle: string
            amount: number
            categoryId: string
            budgetId?: string
          }>
          amount: number
          date: string
          notes: string
        }>
      >(request)
    const account = accounts.find((item) => item.id === body.accountId)
    const createdCategory =
      body.newCategory && body.newCategory.type !== 'TRANSFER'
        ? {
            id: nextId('cat'),
            householdId: account?.householdId ?? 'hh_1',
            name: body.newCategory.name,
            types: [
              body.newCategory.type
            ],
            archived: false,
            createdAt: nowIso()
          }
        : null
    if (createdCategory) {
      categories.push(createdCategory)
    }
    const createdRecipient = body.newRecipientName
      ? {
          id: nextId('rec'),
          householdId: account?.householdId ?? 'hh_1',
          name: body.newRecipientName,
          archived: false,
          createdAt: nowIso()
        }
      : null
    if (createdRecipient) {
      recipients.push(createdRecipient)
    }
    const transaction = {
      id: nextId('txn'),
      name: body.name ?? 'Transaction',
      householdId: account?.householdId ?? 'hh_1',
      type: body.type ?? 'EXPENSE',
      status: 'EFFECTIVE' as const,
      budgetId: body.budgetId ?? null,
      accountId: body.accountId ?? 'acc_1',
      categoryId: body.categoryId ?? createdCategory?.id ?? null,
      recipientId: body.recipientId ?? createdRecipient?.id ?? null,
      transferToAccountId: body.transferToAccountId ?? null,
      instanceId: body.instanceId ?? null,
      splits: body.splits ?? undefined,
      amount: body.amount ?? 0,
      date: body.date ?? nowIso().slice(0, 10),
      notes: body.notes ?? '',
      createdAt: nowIso()
    }
    transactions.push(transaction)
    if (transaction.instanceId) {
      const billInstanceIndex = billInstances.findIndex(
        (item) => item.id === transaction.instanceId
      )
      if (billInstanceIndex !== -1) {
        billInstances[billInstanceIndex] = {
          ...billInstances[billInstanceIndex],
          transactionId: transaction.id,
          status: 'HANDLED'
        }
      }
      const incomeInstanceIndex = incomeInstances.findIndex(
        (item) => item.id === transaction.instanceId
      )
      if (incomeInstanceIndex !== -1) {
        incomeInstances[incomeInstanceIndex] = {
          ...incomeInstances[incomeInstanceIndex],
          transactionId: transaction.id,
          status: 'HANDLED'
        }
      }
    }
    return HttpResponse.json(enrichTransaction(transaction), {
      status: 201
    })
  }),

  http.get(`${BASE}/transactions/:transactionId`, ({ params }) => {
    const transaction = transactions.find(
      (item) => item.id === params.transactionId
    )
    if (!transaction) {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Transaction not found'
          }
        },
        {
          status: 404
        }
      )
    }
    return HttpResponse.json(enrichTransaction(transaction))
  }),

  http.patch(
    `${BASE}/transactions/:transactionId`,
    async ({ params, request }) => {
      const index = transactions.findIndex(
        (item) => item.id === params.transactionId
      )
      if (index === -1) {
        return HttpResponse.json(
          {
            error: {
              code: 'NOT_FOUND',
              message: 'Transaction not found'
            }
          },
          {
            status: 404
          }
        )
      }
      const body = await readJson<Record<string, unknown>>(request)
      transactions[index] = {
        ...transactions[index],
        ...body
      }
      return HttpResponse.json(enrichTransaction(transactions[index]))
    }
  ),

  http.delete(`${BASE}/transactions/:transactionId`, ({ params }) => {
    const index = transactions.findIndex(
      (item) => item.id === params.transactionId
    )
    if (index === -1) {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Transaction not found'
          }
        },
        {
          status: 404
        }
      )
    }
    transactions.splice(index, 1)
    return HttpResponse.json({
      success: true
    })
  }),

  http.post(`${BASE}/transactions/:transactionId/clone`, ({ params }) => {
    const source = transactions.find((item) => item.id === params.transactionId)
    if (!source) {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Transaction not found'
          }
        },
        {
          status: 404
        }
      )
    }
    const clone = {
      ...source,
      id: nextId('txn'),
      notes: `${source.notes ?? ''} (copy)`.trim(),
      createdAt: nowIso()
    }
    transactions.push(clone)
    return HttpResponse.json(enrichTransaction(clone), {
      status: 201
    })
  })
]
