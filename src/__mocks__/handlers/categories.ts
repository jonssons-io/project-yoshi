import { HttpResponse, http } from 'msw'
import { categories, nextId, nowIso, paginate, readJson } from '../data'

const BASE = '/api/v1'

export const categoryHandlers = [
	http.get(`${BASE}/households/:householdId/categories`, ({ request, params }) => {
		const url = new URL(request.url)
		const filtered = categories.filter(
			(item) => item.householdId === params.householdId
		)
		return HttpResponse.json(
			paginate(
				filtered,
				url.searchParams.get('limit'),
				url.searchParams.get('offset')
			)
		)
	}),

	http.post(
		`${BASE}/households/:householdId/categories`,
		async ({ request, params }) => {
			const body = await readJson<{ name?: string; types?: string[] }>(request)
			const category = {
				id: nextId('cat'),
				householdId: String(params.householdId),
				name: body.name ?? 'New Category',
				types: body.types ?? ['expense'],
				createdAt: nowIso()
			}
			categories.push(category)
			return HttpResponse.json(category, { status: 201 })
		}
	),

	http.get(`${BASE}/categories/:categoryId`, ({ params }) => {
		const category = categories.find((item) => item.id === params.categoryId)
		if (!category) {
			return HttpResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Category not found' } },
				{ status: 404 }
			)
		}
		return HttpResponse.json(category)
	}),

	http.patch(`${BASE}/categories/:categoryId`, async ({ params, request }) => {
		const index = categories.findIndex((item) => item.id === params.categoryId)
		if (index === -1) {
			return HttpResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Category not found' } },
				{ status: 404 }
			)
		}
		const body = await readJson<Record<string, unknown>>(request)
		categories[index] = {
			...categories[index],
			...body
		}
		return HttpResponse.json(categories[index])
	}),

	http.delete(`${BASE}/categories/:categoryId`, ({ params }) => {
		const index = categories.findIndex((item) => item.id === params.categoryId)
		if (index === -1) {
			return HttpResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Category not found' } },
				{ status: 404 }
			)
		}
		categories.splice(index, 1)
		return HttpResponse.json({ success: true })
	})
]
