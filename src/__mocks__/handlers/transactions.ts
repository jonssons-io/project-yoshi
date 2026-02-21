import { HttpResponse, http } from 'msw'
import {
	categories,
	nextId,
	nowIso,
	paginate,
	readJson,
	transactions
} from '../data'

const BASE = '/api/v1'

export const transactionHandlers = [
	http.get(`${BASE}/transactions`, ({ request }) => {
		const url = new URL(request.url)
		const budgetId = url.searchParams.get('budgetId')
		const accountId = url.searchParams.get('accountId')
		const filtered = transactions.filter((item) => {
			if (budgetId && item.budgetId !== budgetId) return false
			if (accountId && item.accountId !== accountId) return false
			return true
		})
		return HttpResponse.json(
			paginate(
				filtered,
				url.searchParams.get('limit'),
				url.searchParams.get('offset')
			)
		)
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
			Object.entries(grouped).map(([name, total]) => ({ name, total }))
		)
	}),

	http.post(`${BASE}/transactions`, async ({ request }) => {
		const body = await readJson<
			Partial<{
				budgetId: string
				accountId: string
				categoryId: string
				recipientId: string
				billId: string
				amount: number
				date: string
				note: string
			}>
		>(request)
		const transaction = {
			id: nextId('txn'),
			budgetId: body.budgetId ?? 'budget_1',
			accountId: body.accountId ?? 'acc_1',
			categoryId: body.categoryId ?? null,
			recipientId: body.recipientId ?? null,
			billId: body.billId ?? null,
			amount: body.amount ?? 0,
			date: body.date ?? nowIso().slice(0, 10),
			note: body.note ?? '',
			createdAt: nowIso()
		}
		transactions.push(transaction)
		return HttpResponse.json(transaction, { status: 201 })
	}),

	http.get(`${BASE}/transactions/:transactionId`, ({ params }) => {
		const transaction = transactions.find((item) => item.id === params.transactionId)
		if (!transaction) {
			return HttpResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Transaction not found' } },
				{ status: 404 }
			)
		}
		return HttpResponse.json(transaction)
	}),

	http.patch(`${BASE}/transactions/:transactionId`, async ({ params, request }) => {
		const index = transactions.findIndex((item) => item.id === params.transactionId)
		if (index === -1) {
			return HttpResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Transaction not found' } },
				{ status: 404 }
			)
		}
		const body = await readJson<Record<string, unknown>>(request)
		transactions[index] = { ...transactions[index], ...body }
		return HttpResponse.json(transactions[index])
	}),

	http.delete(`${BASE}/transactions/:transactionId`, ({ params }) => {
		const index = transactions.findIndex((item) => item.id === params.transactionId)
		if (index === -1) {
			return HttpResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Transaction not found' } },
				{ status: 404 }
			)
		}
		transactions.splice(index, 1)
		return HttpResponse.json({ success: true })
	}),

	http.post(`${BASE}/transactions/:transactionId/clone`, ({ params }) => {
		const source = transactions.find((item) => item.id === params.transactionId)
		if (!source) {
			return HttpResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Transaction not found' } },
				{ status: 404 }
			)
		}
		const clone = {
			...source,
			id: nextId('txn'),
			note: `${source.note} (copy)`,
			createdAt: nowIso()
		}
		transactions.push(clone)
		return HttpResponse.json(clone, { status: 201 })
	})
]
