import { HttpResponse, http } from 'msw'
import {
	householdMembers,
	households,
	nextId,
	nowIso,
	readJson
} from '../data'

const BASE = '/api/v1'

export const householdHandlers = [
	http.get(`${BASE}/households`, () => {
		return HttpResponse.json(households)
	}),

	http.get(`${BASE}/households/:householdId`, ({ params }) => {
		const household = households.find((item) => item.id === params.householdId)
		if (!household) {
			return HttpResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Household not found' } },
				{ status: 404 }
			)
		}
		return HttpResponse.json(household)
	}),

	http.post(`${BASE}/households`, async ({ request }) => {
		const body = await readJson<{ name?: string }>(request)
		const household = {
			id: nextId('hh'),
			name: body.name ?? 'New Household',
			createdAt: nowIso()
		}
		households.push(household)
		return HttpResponse.json(household, { status: 201 })
	}),

	http.patch(`${BASE}/households/:householdId`, async ({ request, params }) => {
		const index = households.findIndex((item) => item.id === params.householdId)
		if (index === -1) {
			return HttpResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Household not found' } },
				{ status: 404 }
			)
		}
		const body = await readJson<{ name?: string }>(request)
		households[index] = {
			...households[index],
			name: body.name ?? households[index].name
		}
		return HttpResponse.json(households[index])
	}),

	http.delete(`${BASE}/households/:householdId`, ({ params }) => {
		const index = households.findIndex((item) => item.id === params.householdId)
		if (index === -1) {
			return HttpResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Household not found' } },
				{ status: 404 }
			)
		}
		households.splice(index, 1)
		return HttpResponse.json({ success: true })
	}),

	http.get(`${BASE}/households/:householdId/members`, ({ params }) => {
		const members = householdMembers.filter(
			(item) => item.householdId === params.householdId
		)
		return HttpResponse.json(members)
	}),

	http.put(`${BASE}/households/:householdId/members/:userId`, ({ params }) => {
		const existing = householdMembers.find(
			(item) =>
				item.householdId === params.householdId && item.id === params.userId
		)
		if (existing) {
			return HttpResponse.json(existing)
		}
		const member = {
			id: String(params.userId),
			householdId: String(params.householdId),
			email: `${params.userId}@example.com`,
			name: `User ${params.userId}`
		}
		householdMembers.push(member)
		return HttpResponse.json(member)
	}),

	http.delete(`${BASE}/households/:householdId/members/:userId`, ({ params }) => {
		const index = householdMembers.findIndex(
			(item) =>
				item.householdId === params.householdId && item.id === params.userId
		)
		if (index === -1) {
			return HttpResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Member not found' } },
				{ status: 404 }
			)
		}
		householdMembers.splice(index, 1)
		return HttpResponse.json({ success: true })
	})
]
