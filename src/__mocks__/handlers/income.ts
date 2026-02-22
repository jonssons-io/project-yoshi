import { HttpResponse, http } from 'msw'
import {
	accounts,
	categories,
	incomes,
	incomeSources,
	nextId,
	nowIso,
	paginate,
	readJson
} from '../data'

const BASE = '/api/v1'

// Mock the generated response shape by including linked resources.
const enrichIncome = (income: (typeof incomes)[number]) => ({
	...income,
	account: accounts.find((item) => item.id === income.accountId),
	category: categories.find((item) => item.id === income.categoryId),
	incomeSource: incomeSources.find((item) => item.id === income.incomeSourceId)
})

export const incomeHandlers = [
	http.get(`${BASE}/households/:householdId/incomes`, ({ request, params }) => {
		const url = new URL(request.url)
		const filtered = incomes.filter((item) => item.householdId === params.householdId)
		return HttpResponse.json(
			paginate(
				filtered.map(enrichIncome),
				url.searchParams.get('limit'),
				url.searchParams.get('offset')
			)
		)
	}),

	http.post(`${BASE}/households/:householdId/incomes`, async ({ request, params }) => {
		const body = await readJson<
			Partial<{
				name: string
				accountId: string
				categoryId: string
				incomeSourceId: string
				newIncomeSourceName: string
				amount: number
				expectedDate: string
				recurrenceType: string
				customIntervalDays: number
				endDate: string
			}>
		>(request)
		const createdIncomeSource =
			body.newIncomeSourceName && params.householdId
				? {
						id: nextId('isrc'),
						householdId: String(params.householdId),
						name: body.newIncomeSourceName,
						createdAt: nowIso()
					}
				: null
		if (createdIncomeSource) {
			incomeSources.push(createdIncomeSource)
		}

		const income = {
			id: nextId('income'),
			name: body.name ?? 'Income',
			householdId: String(params.householdId),
			incomeSourceId:
				body.incomeSourceId ??
				createdIncomeSource?.id ??
				incomeSources[0]?.id ??
				'isrc_1',
			accountId: body.accountId ?? 'acc_1',
			categoryId: body.categoryId ?? 'cat_2',
			estimatedAmount: body.amount ?? 0,
			expectedDate: body.expectedDate ?? nowIso().slice(0, 10),
			recurrenceType: body.recurrenceType ?? 'MONTHLY',
			customIntervalDays: body.customIntervalDays,
			endDate: body.endDate ?? null,
			isArchived: false,
			createdAt: nowIso()
		}
		incomes.push(income)
		return HttpResponse.json(enrichIncome(income), { status: 201 })
	}),

	http.get(`${BASE}/incomes/:incomeId`, ({ params }) => {
		const income = incomes.find((item) => item.id === params.incomeId)
		if (!income) {
			return HttpResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Income not found' } },
				{ status: 404 }
			)
		}
		return HttpResponse.json(enrichIncome(income))
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
		const createdIncomeSource =
			typeof body.newIncomeSourceName === 'string' &&
			body.newIncomeSourceName.length > 0
				? {
						id: nextId('isrc'),
						householdId: incomes[index].householdId,
						name: body.newIncomeSourceName,
						createdAt: nowIso()
					}
				: null
		if (createdIncomeSource) {
			incomeSources.push(createdIncomeSource)
		}

		const amount =
			typeof body.amount === 'number' ? body.amount : incomes[index].estimatedAmount
		incomes[index] = {
			...incomes[index],
			...body,
			estimatedAmount: amount,
			incomeSourceId:
				typeof body.incomeSourceId === 'string'
					? body.incomeSourceId
					: createdIncomeSource?.id ?? incomes[index].incomeSourceId
		}
		return HttpResponse.json(enrichIncome(incomes[index]))
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
		return HttpResponse.json(enrichIncome(incomes[index]))
	})
]
