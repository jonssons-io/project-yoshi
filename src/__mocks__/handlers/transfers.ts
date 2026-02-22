import { HttpResponse, http } from 'msw'
import { nextId, paginate, readJson, transfers } from '../data'

const BASE = '/api/v1'

export const transferHandlers = [
	http.get(`${BASE}/budgets/:budgetId/transfers`, ({ request, params }) => {
		const url = new URL(request.url)
		const filtered = transfers.filter((item) => item.budgetId === params.budgetId)
		return HttpResponse.json(
			paginate(
				filtered,
				url.searchParams.get('limit'),
				url.searchParams.get('offset')
			)
		)
	}),

	http.post(`${BASE}/budgets/:budgetId/transfers`, async ({ request, params }) => {
		const body = await readJson<
			Partial<{
				fromAccountId: string
				toAccountId: string
				amount: number
				date: string
				note: string
			}>
		>(request)
		const transfer = {
			id: nextId('transfer'),
			budgetId: String(params.budgetId),
			fromAccountId: body.fromAccountId ?? 'acc_1',
			toAccountId: body.toAccountId ?? 'acc_2',
			amount: body.amount ?? 0,
			date: body.date ?? new Date().toISOString().slice(0, 10),
			note: body.note ?? ''
		}
		transfers.push(transfer)
		return HttpResponse.json(transfer, { status: 201 })
	}),

	http.patch(`${BASE}/transfers/:transferId`, async ({ params, request }) => {
		const index = transfers.findIndex((item) => item.id === params.transferId)
		if (index === -1) {
			return HttpResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Transfer not found' } },
				{ status: 404 }
			)
		}
		const body = await readJson<Record<string, unknown>>(request)
		transfers[index] = { ...transfers[index], ...body }
		return HttpResponse.json(transfers[index])
	}),

	http.delete(`${BASE}/transfers/:transferId`, ({ params }) => {
		const index = transfers.findIndex((item) => item.id === params.transferId)
		if (index === -1) {
			return HttpResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Transfer not found' } },
				{ status: 404 }
			)
		}
		transfers.splice(index, 1)
		return HttpResponse.json({ success: true })
	})
]
