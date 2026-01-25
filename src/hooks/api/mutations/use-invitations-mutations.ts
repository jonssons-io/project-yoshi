import { createMutationHook, invalidateQuery } from './create-mutation-hook'

export const useCreateInvitation = createMutationHook(
	'invitations',
	'create',
	() => [invalidateQuery(['invitations', 'listByHousehold'])]
)

export const useAcceptInvitation = createMutationHook(
	'invitations',
	'accept',
	(variables) => [
		invalidateQuery(['invitations', 'list']),
		invalidateQuery(['households', 'list']) // User joined new household
	]
)

export const useDeclineInvitation = createMutationHook(
	'invitations',
	'decline',
	(variables) => [invalidateQuery(['invitations', 'list'])]
)

export const useRevokeInvitation = createMutationHook(
	'invitations',
	'revoke',
	() => [invalidateQuery(['invitations', 'listByHousehold'])]
)
