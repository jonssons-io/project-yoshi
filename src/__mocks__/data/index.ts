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
	isArchived: boolean
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
	isArchived: boolean
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
	householdId: string
	accountId: string
	categoryId: string | null
	recipientId: string | null
	amount: number
	recurrenceType: string
	recurrenceValue: number
	startDate: string
	endDate: string | null
	isArchived: boolean
	createdAt: string
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
	budgetId: string
	accountId: string
	categoryId: string | null
	recipientId: string | null
	billId: string | null
	amount: number
	date: string
	note: string
	createdAt: string
}

export type Bill = {
	id: string
	budgetId: string
	name: string
	amount: number
	dueDay: number
	recurrenceType: string
	isArchived: boolean
	createdAt: string
}

export type BillInstance = {
	id: string
	billId: string
	budgetId: string
	amount: number
	dueDate: string
	status: 'pending' | 'paid' | 'overdue'
}

export type Transfer = {
	id: string
	budgetId: string
	fromAccountId: string
	toAccountId: string
	amount: number
	date: string
	note: string
}

export type Allocation = {
	id: string
	budgetId: string
	categoryId: string
	amount: number
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
	{ id: 'hh_1', name: 'Family Home', createdAt: nowIso() },
	{ id: 'hh_2', name: 'Vacation Cabin', createdAt: nowIso() }
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
		isArchived: false,
		createdAt: nowIso()
	},
	{
		id: 'acc_2',
		householdId: 'hh_1',
		name: 'Savings',
		externalIdentifier: 'SAV-002',
		initialBalance: 8000,
		currentBalance: 8400,
		isArchived: false,
		createdAt: nowIso()
	}
]

export const categories: Category[] = [
	{
		id: 'cat_1',
		householdId: 'hh_1',
		name: 'Groceries',
		types: ['expense'],
		createdAt: nowIso()
	},
	{
		id: 'cat_2',
		householdId: 'hh_1',
		name: 'Salary',
		types: ['income'],
		createdAt: nowIso()
	}
]

export const budgets: Budget[] = [
	{
		id: 'budget_1',
		householdId: 'hh_1',
		name: 'January Budget',
		startDate: '2026-01-01',
		endDate: '2026-01-31',
		isArchived: false,
		categoryIds: ['cat_1', 'cat_2'],
		accountIds: ['acc_1', 'acc_2'],
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

export const incomes: Income[] = [
	{
		id: 'income_1',
		householdId: 'hh_1',
		accountId: 'acc_1',
		categoryId: 'cat_2',
		recipientId: null,
		amount: 3200,
		recurrenceType: 'monthly',
		recurrenceValue: 1,
		startDate: '2026-01-01',
		endDate: null,
		isArchived: false,
		createdAt: nowIso()
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
		budgetId: 'budget_1',
		accountId: 'acc_1',
		categoryId: 'cat_1',
		recipientId: 'rec_1',
		billId: null,
		amount: -85.5,
		date: '2026-01-12',
		note: 'Weekly groceries',
		createdAt: nowIso()
	},
	{
		id: 'txn_2',
		budgetId: 'budget_1',
		accountId: 'acc_1',
		categoryId: 'cat_2',
		recipientId: null,
		billId: null,
		amount: 3200,
		date: '2026-01-01',
		note: 'Paycheck',
		createdAt: nowIso()
	}
]

export const bills: Bill[] = [
	{
		id: 'bill_1',
		budgetId: 'budget_1',
		name: 'Electricity',
		amount: 120,
		dueDay: 15,
		recurrenceType: 'monthly',
		isArchived: false,
		createdAt: nowIso()
	}
]

export const billInstances: BillInstance[] = [
	{
		id: 'billinst_1',
		billId: 'bill_1',
		budgetId: 'budget_1',
		amount: 120,
		dueDate: '2026-01-15',
		status: 'paid'
	}
]

export const transfers: Transfer[] = [
	{
		id: 'transfer_1',
		budgetId: 'budget_1',
		fromAccountId: 'acc_1',
		toAccountId: 'acc_2',
		amount: 300,
		date: '2026-01-20',
		note: 'Move to savings'
	}
]

export const allocations: Allocation[] = [
	{
		id: 'alloc_1',
		budgetId: 'budget_1',
		categoryId: 'cat_1',
		amount: 600,
		createdAt: nowIso()
	}
]
