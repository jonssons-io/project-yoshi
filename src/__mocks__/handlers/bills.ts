import { HttpResponse, http } from 'msw'
import {
	billInstances,
	bills,
	nextId,
	nowIso,
	paginate,
	readJson
} from '../data'

const BASE = '/api/v1'

export const billHandlers = [
	http.get(`${BASE}/budgets/:budgetId/bill-instances`, ({ request, params }) => {
		const url = new URL(request.url)
		const filtered = billInstances.filter((item) => item.budgetId === params.budgetId)
		return HttpResponse.json(
			paginate(
				filtered,
				url.searchParams.get('limit'),
				url.searchParams.get('offset')
			)
		)
	}),

	http.post(`${BASE}/budgets/:budgetId/bills`, async ({ request, params }) => {
		const body = await readJson<
			Partial<{
				name: string
				amount: number
				dueDay: number
				recurrenceType: string
			}>
		>(request)
		const bill = {
			id: nextId('bill'),
			budgetId: String(params.budgetId),
			name: body.name ?? 'New Bill',
			amount: body.amount ?? 0,
			dueDay: body.dueDay ?? 1,
			recurrenceType: body.recurrenceType ?? 'monthly',
			isArchived: false,
			createdAt: nowIso()
		}
		bills.push(bill)
		billInstances.push({
			id: nextId('billinst'),
			billId: bill.id,
			budgetId: bill.budgetId,
			amount: bill.amount,
			dueDate: nowIso().slice(0, 10),
			status: 'pending'
		})
		return HttpResponse.json(bill, { status: 201 })
	}),

	http.patch(`${BASE}/bills/:billId`, async ({ params, request }) => {
		const index = bills.findIndex((item) => item.id === params.billId)
		if (index === -1) {
			return HttpResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Bill not found' } },
				{ status: 404 }
			)
		}
		const body = await readJson<Record<string, unknown>>(request)
		bills[index] = { ...bills[index], ...body }
		return HttpResponse.json(bills[index])
	}),

	http.delete(`${BASE}/bills/:billId`, ({ params }) => {
		const billIndex = bills.findIndex((item) => item.id === params.billId)
		if (billIndex === -1) {
			return HttpResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Bill not found' } },
				{ status: 404 }
			)
		}
		const billId = bills[billIndex].id
		bills.splice(billIndex, 1)

		for (let i = billInstances.length - 1; i >= 0; i -= 1) {
			if (billInstances[i].billId === billId) {
				billInstances.splice(i, 1)
			}
		}
		return HttpResponse.json({ success: true })
	}),

	http.patch(`${BASE}/bills/:billId/archive`, ({ params }) => {
		const index = bills.findIndex((item) => item.id === params.billId)
		if (index === -1) {
			return HttpResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Bill not found' } },
				{ status: 404 }
			)
		}
		bills[index] = { ...bills[index], isArchived: !bills[index].isArchived }
		return HttpResponse.json(bills[index])
	}),

	http.get(`${BASE}/bill-instances/:instanceId`, ({ params }) => {
		const instance = billInstances.find((item) => item.id === params.instanceId)
		if (!instance) {
			return HttpResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Bill instance not found' } },
				{ status: 404 }
			)
		}
		return HttpResponse.json(instance)
	}),

	http.patch(`${BASE}/bill-instances/:instanceId`, async ({ params, request }) => {
		const index = billInstances.findIndex((item) => item.id === params.instanceId)
		if (index === -1) {
			return HttpResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Bill instance not found' } },
				{ status: 404 }
			)
		}
		const body = await readJson<Record<string, unknown>>(request)
		billInstances[index] = { ...billInstances[index], ...body }
		return HttpResponse.json(billInstances[index])
	})
]
