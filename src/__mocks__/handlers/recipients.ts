import { HttpResponse, http } from 'msw'
import { nextId, nowIso, paginate, readJson, recipients } from '../data'

const BASE = '/api/v1'

export const recipientHandlers = [
	http.get(`${BASE}/households/:householdId/recipients`, ({ request, params }) => {
		const url = new URL(request.url)
		const filtered = recipients.filter(
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

	http.post(`${BASE}/households/:householdId/recipients`, async ({ request, params }) => {
		const body = await readJson<{ name?: string }>(request)
		const recipient = {
			id: nextId('rec'),
			householdId: String(params.householdId),
			name: body.name ?? 'New Recipient',
			createdAt: nowIso()
		}
		recipients.push(recipient)
		return HttpResponse.json(recipient, { status: 201 })
	}),

	http.post(
		`${BASE}/households/:householdId/recipients/get-or-create`,
		async ({ request, params }) => {
			const body = await readJson<{ name?: string }>(request)
			const existing = recipients.find(
				(item) =>
					item.householdId === params.householdId && item.name === body.name
			)
			if (existing) {
				return HttpResponse.json(existing)
			}
			const recipient = {
				id: nextId('rec'),
				householdId: String(params.householdId),
				name: body.name ?? 'New Recipient',
				createdAt: nowIso()
			}
			recipients.push(recipient)
			return HttpResponse.json(recipient, { status: 201 })
		}
	),

	http.get(`${BASE}/recipients/:recipientId`, ({ params }) => {
		const recipient = recipients.find((item) => item.id === params.recipientId)
		if (!recipient) {
			return HttpResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Recipient not found' } },
				{ status: 404 }
			)
		}
		return HttpResponse.json(recipient)
	}),

	http.patch(`${BASE}/recipients/:recipientId`, async ({ params, request }) => {
		const index = recipients.findIndex((item) => item.id === params.recipientId)
		if (index === -1) {
			return HttpResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Recipient not found' } },
				{ status: 404 }
			)
		}
		const body = await readJson<Record<string, unknown>>(request)
		recipients[index] = { ...recipients[index], ...body }
		return HttpResponse.json(recipients[index])
	}),

	http.delete(`${BASE}/recipients/:recipientId`, ({ params }) => {
		const index = recipients.findIndex((item) => item.id === params.recipientId)
		if (index === -1) {
			return HttpResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Recipient not found' } },
				{ status: 404 }
			)
		}
		recipients.splice(index, 1)
		return HttpResponse.json({ success: true })
	})
]
