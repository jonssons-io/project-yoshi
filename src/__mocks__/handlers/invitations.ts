import { HttpResponse, http } from 'msw'
import { invitations, nextId, nowIso, readJson } from '../data'

const BASE = '/api/v1'

export const invitationHandlers = [
	http.get(`${BASE}/invitations`, () => {
		return HttpResponse.json(invitations)
	}),

	http.get(`${BASE}/households/:householdId/invitations`, ({ params }) => {
		return HttpResponse.json(
			invitations.filter((item) => item.householdId === params.householdId)
		)
	}),

	http.post(
		`${BASE}/households/:householdId/invitations`,
		async ({ request, params }) => {
			const body = await readJson<{ email?: string }>(request)
			const invitation = {
				id: nextId('inv'),
				householdId: String(params.householdId),
				email: body.email ?? 'new-user@example.com',
				status: 'pending' as const,
				createdAt: nowIso()
			}
			invitations.push(invitation)
			return HttpResponse.json(invitation, { status: 201 })
		}
	),

	http.post(`${BASE}/invitations/:invitationId/accept`, ({ params }) => {
		const index = invitations.findIndex((item) => item.id === params.invitationId)
		if (index === -1) {
			return HttpResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Invitation not found' } },
				{ status: 404 }
			)
		}
		invitations[index] = { ...invitations[index], status: 'accepted' }
		return HttpResponse.json(invitations[index])
	}),

	http.post(`${BASE}/invitations/:invitationId/decline`, ({ params }) => {
		const index = invitations.findIndex((item) => item.id === params.invitationId)
		if (index === -1) {
			return HttpResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Invitation not found' } },
				{ status: 404 }
			)
		}
		invitations[index] = { ...invitations[index], status: 'declined' }
		return HttpResponse.json(invitations[index])
	}),

	http.delete(`${BASE}/invitations/:invitationId`, ({ params }) => {
		const index = invitations.findIndex((item) => item.id === params.invitationId)
		if (index === -1) {
			return HttpResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Invitation not found' } },
				{ status: 404 }
			)
		}
		invitations.splice(index, 1)
		return HttpResponse.json({ success: true })
	})
]
