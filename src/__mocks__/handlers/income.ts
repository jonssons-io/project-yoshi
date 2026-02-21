import { HttpResponse, http } from 'msw'
import { incomes, nextId, nowIso, paginate, readJson } from '../data'

const BASE = '/api/v1'

export const incomeHandlers = [
	http.get(`${BASE}/households/:householdId/incomes`, ({ request, params }) => {
		const url = new URL(request.url)
		const filtered = incomes.filter((item) => item.householdId === params.householdId)
		return HttpResponse.json(
			paginate(
				filtered,
				url.searchParams.get('limit'),
				url.searchParams.get('offset')
			)
		)
	}),

	http.post(`${BASE}/households/:householdId/incomes`, async ({ request, params }) => {
		const body = await readJson<
			Partial<{
				accountId: string
				categoryId: string | null
				recipientId: string | null
				amount: number
				recurrenceType: string
				recurrenceValue: number
				startDate: string
				endDate: string | null
			}>
		>(request)
		const income = {
			id: nextId('income'),
			householdId: String(params.householdId),
			accountId: body.accountId ?? 'acc_1',
			categoryId: body.categoryId ?? null,
			recipientId: body.recipientId ?? null,
			amount: body.amount ?? 0,
			recurrenceType: body.recurrenceType ?? 'monthly',
			recurrenceValue: body.recurrenceValue ?? 1,
			startDate: body.startDate ?? nowIso().slice(0, 10),
			endDate: body.endDate ?? null,
			isArchived: false,
			createdAt: nowIso()
		}
		incomes.push(income)
		return HttpResponse.json(income, { status: 201 })
	}),

	http.get(`${BASE}/incomes/:incomeId`, ({ params }) => {
		const income = incomes.find((item) => item.id === params.incomeId)
		if (!income) {
			return HttpResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Income not found' } },
				{ status: 404 }
			)
		}
		return HttpResponse.json(income)
	}),

	http.patch(`${BASE}/incomes/:incomeId`, async ({ params, request }) => {
		const index = incomes.findIndex((item) => item.id === params.incomeId)
		if (index === -1) {
			return HttpResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Income not found' } },
				{ status: 404 }
			)
		}
		const body = await readJson<Record<string, unknown>>(request)
		incomes[index] = { ...incomes[index], ...body }
		return HttpResponse.json(incomes[index])
	}),

	http.delete(`${BASE}/incomes/:incomeId`, ({ params }) => {
		const index = incomes.findIndex((item) => item.id === params.incomeId)
		if (index === -1) {
			return HttpResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Income not found' } },
				{ status: 404 }
			)
		}
		incomes.splice(index, 1)
		return HttpResponse.json({ success: true })
	}),

	http.patch(`${BASE}/incomes/:incomeId/archive`, ({ params }) => {
		const index = incomes.findIndex((item) => item.id === params.incomeId)
		if (index === -1) {
			return HttpResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Income not found' } },
				{ status: 404 }
			)
		}
		incomes[index] = { ...incomes[index], isArchived: !incomes[index].isArchived }
		return HttpResponse.json(incomes[index])
	})
]
