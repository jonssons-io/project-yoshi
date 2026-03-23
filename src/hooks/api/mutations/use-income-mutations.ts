import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  archiveIncomeMutation,
  archiveIncomeSourceMutation,
  createIncomeMutation,
  deleteIncomeMutation,
  getIncomeInstanceQueryKey,
  updateIncomeInstanceMutation,
  updateIncomeMutation
} from '@/api/generated/@tanstack/react-query.gen'
import type {
  ArchiveIncomeRequest,
  ArchiveIncomeResponse,
  ArchiveIncomeSourceRequest,
  ArchiveIncomeSourceResponse,
  CreateIncomeRequest,
  CreateIncomeResponse,
  DeleteIncomeResponse,
  UpdateIncomeInstanceRequest,
  UpdateIncomeInstanceResponse,
  UpdateIncomeRequest,
  UpdateIncomeResponse
} from '@/api/generated/types.gen'
import { toApiDate, toApiDateRequired } from '@/hooks/api/date-normalization'
import { invalidateByOperation } from '../invalidate-by-operation'
import type { MutationCallbacks } from '../types'

type IncomeCreateVariables = {
  householdId: string
  userId?: string | null
} & Omit<CreateIncomeRequest, 'expectedDate' | 'endDate'> & {
    expectedDate: string | Date
    endDate?: string | Date
  }
type IncomeUpdateVariables = {
  id: string
  userId?: string | null
} & Omit<UpdateIncomeRequest, 'expectedDate' | 'endDate'> & {
    expectedDate?: string | Date
    endDate?: string | Date
  }
type IncomeDeleteVariables = {
  id: string
  userId?: string | null
}
type IncomeArchiveVariables = {
  id: string
  archived: ArchiveIncomeRequest['archived']
  userId?: string | null
}
type IncomeSourceArchiveVariables = {
  id: string
  archived: ArchiveIncomeSourceRequest['archived']
  userId?: string | null
}
type IncomeInstanceUpdateVariables = {
  id: string
  userId?: string | null
} & Omit<UpdateIncomeInstanceRequest, 'expectedDate'> & {
    expectedDate?: string | Date
  }

/**
 * Hook to create a new income
 */
export function useCreateIncome(
  callbacks?: MutationCallbacks<CreateIncomeResponse, IncomeCreateVariables>
) {
  const queryClient = useQueryClient()
  const mutationOptions = createIncomeMutation()
  return useMutation<CreateIncomeResponse, Error, IncomeCreateVariables>({
    mutationFn: async (variables: IncomeCreateVariables) => {
      const {
        householdId,
        userId: _userId,
        expectedDate,
        endDate,
        ...rest
      } = variables
      const body = {
        ...rest,
        expectedDate: toApiDateRequired(expectedDate),
        endDate: toApiDate(endDate)
      }
      const mutationFn = mutationOptions.mutationFn
      if (!mutationFn) throw new Error('Missing createIncome mutation function')
      return mutationFn(
        {
          path: {
            householdId
          },
          body
        },
        {} as never
      )
    },
    onSuccess: (data, variables) => {
      invalidateByOperation(queryClient, 'listIncomes')
      invalidateByOperation(queryClient, 'listCategories')
      callbacks?.onSuccess?.(data, variables)
    },
    onError: (error, variables) => {
      callbacks?.onError?.(error, variables)
    }
  })
}

/**
 * Hook to update an existing income
 */
export function useUpdateIncome(
  callbacks?: MutationCallbacks<UpdateIncomeResponse, IncomeUpdateVariables>
) {
  const queryClient = useQueryClient()
  const mutationOptions = updateIncomeMutation()
  return useMutation<UpdateIncomeResponse, Error, IncomeUpdateVariables>({
    mutationFn: async (variables: IncomeUpdateVariables) => {
      const { id, userId: _userId, expectedDate, endDate, ...rest } = variables
      const body = {
        ...rest,
        expectedDate: toApiDate(expectedDate),
        endDate: toApiDate(endDate)
      }
      const mutationFn = mutationOptions.mutationFn
      if (!mutationFn) throw new Error('Missing updateIncome mutation function')
      return mutationFn(
        {
          path: {
            incomeId: id
          },
          body
        },
        {} as never
      )
    },
    onSuccess: (data, variables) => {
      invalidateByOperation(queryClient, 'listIncomes')
      invalidateByOperation(queryClient, 'listCategories')
      callbacks?.onSuccess?.(data, variables)
    },
    onError: (error, variables) => {
      callbacks?.onError?.(error, variables)
    }
  })
}

/**
 * Hook to delete an income
 */
export function useDeleteIncome(
  callbacks?: MutationCallbacks<DeleteIncomeResponse, IncomeDeleteVariables>
) {
  const queryClient = useQueryClient()
  const mutationOptions = deleteIncomeMutation()
  return useMutation<DeleteIncomeResponse, Error, IncomeDeleteVariables>({
    mutationFn: async (variables: IncomeDeleteVariables) =>
      (() => {
        const mutationFn = mutationOptions.mutationFn
        if (!mutationFn)
          throw new Error('Missing deleteIncome mutation function')
        return mutationFn(
          {
            path: {
              incomeId: variables.id
            }
          },
          {} as never
        )
      })(),
    onSuccess: (data, variables) => {
      invalidateByOperation(queryClient, 'listIncomes')
      callbacks?.onSuccess?.(data, variables)
    },
    onError: (error, variables) => {
      callbacks?.onError?.(error, variables)
    }
  })
}

/**
 * Hook to archive/unarchive an income
 */
export function useArchiveIncome(
  callbacks?: MutationCallbacks<ArchiveIncomeResponse, IncomeArchiveVariables>
) {
  const queryClient = useQueryClient()
  const mutationOptions = archiveIncomeMutation()
  return useMutation<ArchiveIncomeResponse, Error, IncomeArchiveVariables>({
    mutationFn: async (variables: IncomeArchiveVariables) =>
      (() => {
        const mutationFn = mutationOptions.mutationFn
        if (!mutationFn)
          throw new Error('Missing archiveIncome mutation function')
        return mutationFn(
          {
            path: {
              incomeId: variables.id
            },
            body: {
              archived: variables.archived
            }
          },
          {} as never
        )
      })(),
    onSuccess: (data, variables) => {
      invalidateByOperation(queryClient, 'listIncomes')
      callbacks?.onSuccess?.(data, variables)
    },
    onError: (error, variables) => {
      callbacks?.onError?.(error, variables)
    }
  })
}

/**
 * Hook to archive/unarchive an income source
 */
export function useArchiveIncomeSource(
  callbacks?: MutationCallbacks<
    ArchiveIncomeSourceResponse,
    IncomeSourceArchiveVariables
  >
) {
  const queryClient = useQueryClient()
  const mutationOptions = archiveIncomeSourceMutation()
  return useMutation<
    ArchiveIncomeSourceResponse,
    Error,
    IncomeSourceArchiveVariables
  >({
    mutationFn: async (variables: IncomeSourceArchiveVariables) => {
      const mutationFn = mutationOptions.mutationFn
      if (!mutationFn)
        throw new Error('Missing archiveIncomeSource mutation function')
      return mutationFn(
        {
          path: {
            incomeSourceId: variables.id
          },
          body: {
            archived: variables.archived
          }
        },
        {} as never
      )
    },
    onSuccess: (data, variables) => {
      invalidateByOperation(queryClient, 'listIncomes')
      invalidateByOperation(queryClient, 'listIncomeSources')
      callbacks?.onSuccess?.(data, variables)
    },
    onError: (error, variables) => {
      callbacks?.onError?.(error, variables)
    }
  })
}

/**
 * Hook to update an income instance.
 */
export function useUpdateIncomeInstance(
  callbacks?: MutationCallbacks<
    UpdateIncomeInstanceResponse,
    IncomeInstanceUpdateVariables
  >
) {
  const queryClient = useQueryClient()
  const mutationOptions = updateIncomeInstanceMutation()

  return useMutation<
    UpdateIncomeInstanceResponse,
    Error,
    IncomeInstanceUpdateVariables
  >({
    mutationFn: async (variables: IncomeInstanceUpdateVariables) => {
      const { id, userId: _userId, expectedDate, ...rest } = variables
      const body = {
        ...rest,
        expectedDate: toApiDate(expectedDate)
      }
      const mutationFn = mutationOptions.mutationFn
      if (!mutationFn) {
        throw new Error('Missing updateIncomeInstance mutation function')
      }
      return mutationFn(
        {
          path: {
            instanceId: id
          },
          body
        },
        {} as never
      )
    },
    onSuccess: (data, variables) => {
      invalidateByOperation(queryClient, 'listIncomeInstances')
      queryClient.invalidateQueries({
        queryKey: getIncomeInstanceQueryKey({
          path: {
            instanceId: variables.id
          }
        })
      })
      callbacks?.onSuccess?.(data, variables)
    },
    onError: (error, variables) => {
      callbacks?.onError?.(error, variables)
    }
  })
}
