import { HttpResponse, http } from 'msw'
import { accounts, nextId, nowIso, paginate, readJson, transactions } from '../data'

const BASE = '/api/v1'

export const accountHandlers = [
	http.get(`${BASE}/households/:householdId/accounts`, ({ request, params }) => {
		const url = new URL(request.url)
		const budgetId = url.searchParams.get('budgetId')
		const excludeArchived = url.searchParams.get('excludeArchived') === 'true'
		const filtered = accounts.filter((item) => {
			if (item.householdId !== params.householdId) return false
			if (excludeArchived && item.isArchived) return false
			if (!budgetId) return true
			return transactions.some(
				(txn) => txn.budgetId === budgetId && txn.accountId === item.id
			)
		})
		return HttpResponse.json(
			paginate(
				filtered,
				url.searchParams.get('limit'),
				url.searchParams.get('offset')
			)
		)
	}),

	http.post(`${BASE}/households/:householdId/accounts`, async ({ request, params }) => {
		const body = await readJson<{
			name?: string
			externalIdentifier?: string | null
			initialBalance?: number
		}>(request)
		const account = {
			id: nextId('acc'),
			householdId: String(params.householdId),
			name: body.name ?? 'New Account',
			externalIdentifier: body.externalIdentifier ?? null,
			initialBalance: body.initialBalance ?? 0,
			currentBalance: body.initialBalance ?? 0,
			isArchived: false,
			createdAt: nowIso()
		}
		accounts.push(account)
		return HttpResponse.json(account, { status: 201 })
	}),

	http.get(`${BASE}/accounts/:accountId`, ({ params }) => {
		const account = accounts.find((item) => item.id === params.accountId)
		if (!account) {
			return HttpResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Account not found' } },
				{ status: 404 }
			)
		}
		return HttpResponse.json(account)
	}),

	http.patch(`${BASE}/accounts/:accountId`, async ({ params, request }) => {
		const index = accounts.findIndex((item) => item.id === params.accountId)
		if (index === -1) {
			return HttpResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Account not found' } },
				{ status: 404 }
			)
		}
		const body = await readJson<Record<string, unknown>>(request)
		accounts[index] = {
			...accounts[index],
			...body
		}
		return HttpResponse.json(accounts[index])
	}),

	http.delete(`${BASE}/accounts/:accountId`, ({ params }) => {
		const index = accounts.findIndex((item) => item.id === params.accountId)
		if (index === -1) {
			return HttpResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Account not found' } },
				{ status: 404 }
			)
		}
		accounts.splice(index, 1)
		return HttpResponse.json({ success: true })
	}),

	http.patch(`${BASE}/accounts/:accountId/archive`, ({ params }) => {
		const index = accounts.findIndex((item) => item.id === params.accountId)
		if (index === -1) {
			return HttpResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Account not found' } },
				{ status: 404 }
			)
		}
		accounts[index] = {
			...accounts[index],
			isArchived: !accounts[index].isArchived
		}
		return HttpResponse.json(accounts[index])
	}),

	http.get(`${BASE}/accounts/:accountId/balance`, ({ params }) => {
		const account = accounts.find((item) => item.id === params.accountId)
		if (!account) {
			return HttpResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Account not found' } },
				{ status: 404 }
			)
		}
		return HttpResponse.json({
			accountId: account.id,
			currentBalance: account.currentBalance,
			initialBalance: account.initialBalance
		})
	}),

	http.get(`${BASE}/accounts/:accountId/balance-history`, ({ params }) => {
		const account = accounts.find((item) => item.id === params.accountId)
		if (!account) {
			return HttpResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Account not found' } },
				{ status: 404 }
			)
		}
		return HttpResponse.json({
			accountId: account.id,
			history: [
				{ date: '2026-01-01', balance: account.initialBalance },
				{ date: '2026-01-15', balance: account.currentBalance - 200 },
				{ date: '2026-01-31', balance: account.currentBalance }
			]
		})
	})
]
