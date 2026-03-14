import { HttpResponse, http } from 'msw'
import {
  householdMembers,
  households,
  invitations,
  nextId,
  nowIso,
  paginate,
  readJson
} from '../data'

const BASE = '/api/v1'

function enrichInvitation(invitation: (typeof invitations)[number]) {
  const household = households.find(
    (item) => item.id === invitation.householdId
  )
  const inviter = (
    invitation as {
      inviterId?: string
    }
  ).inviterId
    ? householdMembers.find(
        (item) =>
          item.id ===
          (
            invitation as {
              inviterId?: string
            }
          ).inviterId
      )
    : householdMembers.find(
        (item) => item.householdId === invitation.householdId
      )

  return {
    id: invitation.id,
    email: invitation.email,
    household: {
      id: household?.id ?? invitation.householdId,
      name: household?.name ?? null
    },
    status: invitation.status.toUpperCase(),
    inviter: {
      id: inviter?.id ?? 'member_1',
      name: inviter?.name ?? null
    },
    createdAt: invitation.createdAt,
    updatedAt:
      (
        invitation as {
          updatedAt?: string
        }
      ).updatedAt ?? invitation.createdAt
  }
}

export const invitationHandlers = [
  http.get(`${BASE}/invitations`, ({ request }) => {
    const url = new URL(request.url)
    return HttpResponse.json(
      paginate(
        invitations.map(enrichInvitation),
        url.searchParams.get('limit'),
        url.searchParams.get('offset')
      )
    )
  }),

  http.get(
    `${BASE}/households/:householdId/invitations`,
    ({ request, params }) => {
      const url = new URL(request.url)
      return HttpResponse.json(
        paginate(
          invitations
            .filter((item) => item.householdId === params.householdId)
            .map(enrichInvitation),
          url.searchParams.get('limit'),
          url.searchParams.get('offset')
        )
      )
    }
  ),

  http.post(
    `${BASE}/households/:householdId/invitations`,
    async ({ request, params }) => {
      const body = await readJson<{
        email?: string
      }>(request)
      const invitation = {
        id: nextId('inv'),
        householdId: String(params.householdId),
        email: body.email ?? 'new-user@example.com',
        status: 'pending' as const,
        inviterId:
          householdMembers.find(
            (item) => item.householdId === params.householdId
          )?.id ?? 'member_1',
        createdAt: nowIso(),
        updatedAt: nowIso()
      }
      invitations.push(invitation)
      return HttpResponse.json(enrichInvitation(invitation), {
        status: 201
      })
    }
  ),

  http.post(`${BASE}/invitations/:invitationId/accept`, ({ params }) => {
    const index = invitations.findIndex(
      (item) => item.id === params.invitationId
    )
    if (index === -1) {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Invitation not found'
          }
        },
        {
          status: 404
        }
      )
    }
    invitations[index] = {
      ...invitations[index],
      status: 'accepted'
    }
    return HttpResponse.json(enrichInvitation(invitations[index]))
  }),

  http.post(`${BASE}/invitations/:invitationId/decline`, ({ params }) => {
    const index = invitations.findIndex(
      (item) => item.id === params.invitationId
    )
    if (index === -1) {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Invitation not found'
          }
        },
        {
          status: 404
        }
      )
    }
    invitations[index] = {
      ...invitations[index],
      status: 'declined'
    }
    return HttpResponse.json(enrichInvitation(invitations[index]))
  }),

  http.delete(`${BASE}/invitations/:invitationId`, ({ params }) => {
    const index = invitations.findIndex(
      (item) => item.id === params.invitationId
    )
    if (index === -1) {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Invitation not found'
          }
        },
        {
          status: 404
        }
      )
    }
    invitations.splice(index, 1)
    return HttpResponse.json({
      success: true
    })
  })
]
