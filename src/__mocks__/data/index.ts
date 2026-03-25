type PaginationMeta = {
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export type PaginatedResponse<T> = {
  data: T[]
  pagination: PaginationMeta
}

export type Household = {
  id: string
  name: string
  createdAt: string
}

export type HouseholdMember = {
  id: string
  householdId: string
  email: string
  name: string
}

export type Account = {
  id: string
  householdId: string
  name: string
  externalIdentifier: string | null
  initialBalance: number
  currentBalance: number
  archived: boolean
  createdAt: string
}

export type Category = {
  id: string
  householdId: string
  name: string
  types: string[]
  createdAt: string
}

export type Budget = {
  id: string
  householdId: string
  name: string
  startDate: string
  endDate: string | null
  archived: boolean
  categoryIds: string[]
  accountIds: string[]
  createdAt: string
}

export type Recipient = {
  id: string
  householdId: string
  name: string
  createdAt: string
}

export type Income = {
  id: string
  name: string
  householdId: string
  incomeSourceId: string
  accountId: string
  categoryId: string
  estimatedAmount: number
  expectedDate: string
  recurrenceType: string
  customIntervalDays?: number
  endDate: string | null
  archived: boolean
  createdAt: string
}

export type IncomeSource = {
  id: string
  householdId: string
  name: string
  createdAt: string
}

export type IncomeInstance = {
  id: string
  incomeId: string
  name: string
  incomeSourceId: string
  amount: number
  expectedDate: string
  accountId: string
  categoryId?: string | null
  status: 'UPCOMING' | 'DUE' | 'HANDLED'
  transactionId?: string | null
  householdId: string
}

export type Invitation = {
  id: string
  householdId: string
  email: string
  status: 'pending' | 'accepted' | 'declined'
  createdAt: string
}

export type Transaction = {
  id: string
  name: string
  householdId: string
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER'
  status: 'EFFECTIVE' | 'PENDING'
  budgetId?: string | null
  accountId: string
  categoryId?: string | null
  recipientId?: string | null
  transferToAccountId?: string | null
  instanceId?: string | null
  splits?: Array<{
    subtitle: string
    amount: number
    categoryId: string
    budgetId?: string
  }>
  amount: number
  date: string
  notes?: string | null
  createdAt: string
}

export type Bill = {
  id: string
  budgetId: string
  name: string
  recipientId: string
  accountId: string
  startDate: string
  recurrenceType: string
  customIntervalDays?: number | null
  estimatedAmount: number
  endDate?: string | null
  lastPaymentDate?: string | null
  categoryId?: string | null
  splits?: Array<{
    subtitle: string
    amount: number
    categoryId?: string | null
  }>
  archived: boolean
  createdAt: string
}

export type BillInstance = {
  id: string
  billId: string
  name: string
  recipientId: string
  amount: number
  dueDate: string
  budgetId: string
  status: 'UPCOMING' | 'DUE' | 'HANDLED'
  transactionId?: string | null
  accountId: string
  categoryId?: string | null
  recurrenceType: string
  customIntervalDays?: number | null
  startDate: string
  archived: boolean
  splits?: Array<{
    subtitle: string
    amount: number
    categoryId?: string | null
  }>
}

export type Allocation = {
  id: string
  budgetId: string
  categoryId: string
  amount: number
  date: string
  createdAt: string
}

let idCounter = 1000

export function nextId(prefix: string): string {
  idCounter += 1
  return `${prefix}_${idCounter}`
}

export function nowIso(): string {
  return new Date().toISOString()
}

export async function readJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T
}

export function paginate<T>(
  items: T[],
  limitRaw: string | null,
  offsetRaw: string | null
): PaginatedResponse<T> {
  const limit = Number(limitRaw ?? 50)
  const offset = Number(offsetRaw ?? 0)
  const page = items.slice(offset, offset + limit)
  return {
    data: page,
    pagination: {
      total: items.length,
      limit,
      offset,
      hasMore: offset + limit < items.length
    }
  }
}

export const households: Household[] = [
  {
    id: 'hh_1',
    name: 'Family Home',
    createdAt: nowIso()
  },
  {
    id: 'hh_2',
    name: 'Vacation Cabin',
    createdAt: nowIso()
  }
]

export const householdMembers: HouseholdMember[] = [
  {
    id: 'member_1',
    householdId: 'hh_1',
    email: 'alex@example.com',
    name: 'Alex'
  },
  {
    id: 'member_2',
    householdId: 'hh_1',
    email: 'sam@example.com',
    name: 'Sam'
  }
]

export const accounts: Account[] = [
  {
    id: 'acc_1',
    householdId: 'hh_1',
    name: 'Main Checking',
    externalIdentifier: 'CHK-001',
    initialBalance: 2500,
    currentBalance: 3100,
    archived: false,
    createdAt: nowIso()
  },
  {
    id: 'acc_2',
    householdId: 'hh_1',
    name: 'Savings',
    externalIdentifier: 'SAV-002',
    initialBalance: 8000,
    currentBalance: 8400,
    archived: false,
    createdAt: nowIso()
  }
]

export const categories: Category[] = [
  {
    id: 'cat_1',
    householdId: 'hh_1',
    name: 'Groceries',
    types: [
      'expense'
    ],
    createdAt: nowIso()
  },
  {
    id: 'cat_2',
    householdId: 'hh_1',
    name: 'Salary',
    types: [
      'income'
    ],
    createdAt: nowIso()
  }
]

export const budgets: Budget[] = [
  {
    id: 'budget_1',
    householdId: 'hh_1',
    name: 'Utilities',
    startDate: '2026-01-01',
    endDate: null,
    archived: false,
    categoryIds: [
      'cat_1',
      'cat_2'
    ],
    accountIds: [
      'acc_1',
      'acc_2'
    ],
    createdAt: nowIso()
  },
  {
    id: 'budget_2',
    householdId: 'hh_1',
    name: 'Groceries',
    startDate: '2026-01-01',
    endDate: null,
    archived: false,
    categoryIds: [
      'cat_1'
    ],
    accountIds: [
      'acc_1'
    ],
    createdAt: nowIso()
  },
  {
    id: 'budget_3',
    householdId: 'hh_1',
    name: 'Rent',
    startDate: '2026-01-01',
    endDate: null,
    archived: false,
    categoryIds: [
      'cat_1'
    ],
    accountIds: [
      'acc_1'
    ],
    createdAt: nowIso()
  }
]

export const recipients: Recipient[] = [
  {
    id: 'rec_1',
    householdId: 'hh_1',
    name: 'City Utilities',
    createdAt: nowIso()
  }
]

export const incomeSources: IncomeSource[] = [
  {
    id: 'isrc_1',
    householdId: 'hh_1',
    name: 'Employer Payroll',
    createdAt: nowIso()
  }
]

export const incomes: Income[] = [
  {
    id: 'income_1',
    name: 'Salary',
    householdId: 'hh_1',
    incomeSourceId: 'isrc_1',
    accountId: 'acc_1',
    categoryId: 'cat_2',
    estimatedAmount: 3200,
    expectedDate: '2026-01-01',
    recurrenceType: 'MONTHLY',
    endDate: null,
    archived: false,
    createdAt: nowIso()
  }
]

export const incomeInstances: IncomeInstance[] = [
  {
    id: 'incomeinst_1',
    incomeId: 'income_1',
    name: 'Salary January',
    incomeSourceId: 'isrc_1',
    amount: 3200,
    expectedDate: '2026-01-01',
    accountId: 'acc_1',
    categoryId: 'cat_2',
    status: 'HANDLED',
    transactionId: 'txn_2',
    householdId: 'hh_1'
  },
  {
    id: 'incomeinst_2',
    incomeId: 'income_1',
    name: 'Salary February',
    incomeSourceId: 'isrc_1',
    amount: 3200,
    expectedDate: '2026-02-01',
    accountId: 'acc_1',
    categoryId: 'cat_2',
    status: 'DUE',
    transactionId: null,
    householdId: 'hh_1'
  },
  {
    id: 'incomeinst_3',
    incomeId: 'income_1',
    name: 'Salary March',
    incomeSourceId: 'isrc_1',
    amount: 3200,
    expectedDate: '2026-03-01',
    accountId: 'acc_1',
    categoryId: 'cat_2',
    status: 'UPCOMING',
    transactionId: null,
    householdId: 'hh_1'
  }
]

export const invitations: Invitation[] = [
  {
    id: 'inv_1',
    householdId: 'hh_1',
    email: 'new-user@example.com',
    status: 'pending',
    createdAt: nowIso()
  }
]

export const transactions: Transaction[] = [
  {
    id: 'txn_1',
    name: 'Weekly groceries',
    householdId: 'hh_1',
    type: 'EXPENSE',
    status: 'EFFECTIVE',
    budgetId: 'budget_1',
    accountId: 'acc_1',
    categoryId: 'cat_1',
    recipientId: 'rec_1',
    amount: -85.5,
    date: '2026-01-12',
    notes: 'Weekly groceries',
    createdAt: nowIso()
  },
  {
    id: 'txn_2',
    name: 'Salary',
    householdId: 'hh_1',
    type: 'INCOME',
    status: 'EFFECTIVE',
    budgetId: null,
    accountId: 'acc_1',
    categoryId: 'cat_2',
    recipientId: null,
    amount: 3200,
    date: '2026-01-01',
    notes: 'Paycheck',
    createdAt: nowIso()
  },
  {
    id: 'txn_3',
    name: 'Transfer',
    householdId: 'hh_1',
    type: 'TRANSFER',
    status: 'EFFECTIVE',
    budgetId: 'budget_1',
    accountId: 'acc_1',
    transferToAccountId: 'acc_2',
    amount: 300,
    date: '2026-01-20',
    notes: 'Move to savings',
    createdAt: nowIso()
  },
  {
    id: 'txn_4',
    name: 'Electricity payment',
    householdId: 'hh_1',
    type: 'EXPENSE',
    status: 'EFFECTIVE',
    budgetId: 'budget_1',
    accountId: 'acc_1',
    categoryId: 'cat_1',
    recipientId: 'rec_1',
    instanceId: 'billinst_1',
    amount: 120,
    date: '2026-01-15',
    notes: 'Paid electricity bill',
    createdAt: nowIso()
  }
]

export const bills: Bill[] = [
  {
    id: 'bill_1',
    budgetId: 'budget_1',
    name: 'Electricity',
    recipientId: 'rec_1',
    accountId: 'acc_1',
    startDate: '2026-01-15',
    recurrenceType: 'MONTHLY',
    customIntervalDays: null,
    estimatedAmount: 120,
    endDate: null,
    lastPaymentDate: null,
    categoryId: 'cat_1',
    splits: [
      {
        subtitle: 'Electricity',
        amount: 120,
        categoryId: 'cat_1'
      }
    ],
    archived: false,
    createdAt: nowIso()
  }
]

export const billInstances: BillInstance[] = [
  {
    id: 'billinst_1',
    billId: 'bill_1',
    name: 'Electricity',
    recipientId: 'rec_1',
    amount: 120,
    budgetId: 'budget_1',
    dueDate: '2026-01-15',
    status: 'HANDLED',
    transactionId: 'txn_4',
    accountId: 'acc_1',
    categoryId: 'cat_1',
    recurrenceType: 'MONTHLY',
    customIntervalDays: null,
    startDate: '2026-01-15',
    archived: false,
    splits: [
      {
        subtitle: 'Electricity',
        amount: 120,
        categoryId: 'cat_1'
      }
    ]
  },
  {
    id: 'billinst_2',
    billId: 'bill_1',
    name: 'Electricity',
    recipientId: 'rec_1',
    amount: 120,
    budgetId: 'budget_1',
    dueDate: '2026-02-15',
    status: 'DUE',
    transactionId: null,
    accountId: 'acc_1',
    categoryId: 'cat_1',
    recurrenceType: 'MONTHLY',
    customIntervalDays: null,
    startDate: '2026-01-15',
    archived: false,
    splits: [
      {
        subtitle: 'Electricity',
        amount: 120,
        categoryId: 'cat_1'
      }
    ]
  },
  {
    id: 'billinst_3',
    billId: 'bill_1',
    name: 'Electricity',
    recipientId: 'rec_1',
    amount: 120,
    budgetId: 'budget_1',
    dueDate: '2026-03-15',
    status: 'UPCOMING',
    transactionId: null,
    accountId: 'acc_1',
    categoryId: 'cat_1',
    recurrenceType: 'MONTHLY',
    customIntervalDays: null,
    startDate: '2026-01-15',
    archived: false,
    splits: [
      {
        subtitle: 'Electricity',
        amount: 120,
        categoryId: 'cat_1'
      }
    ]
  }
]

export const allocations: Allocation[] = [
  {
    id: 'alloc_1',
    budgetId: 'budget_1',
    categoryId: 'cat_1',
    amount: 600,
    date: nowIso(),
    createdAt: nowIso()
  },
  {
    id: 'alloc_2',
    budgetId: 'budget_2',
    categoryId: 'cat_1',
    amount: 1500,
    date: nowIso(),
    createdAt: nowIso()
  },
  {
    id: 'alloc_3',
    budgetId: 'budget_3',
    categoryId: 'cat_1',
    amount: 9000,
    date: nowIso(),
    createdAt: nowIso()
  }
]
