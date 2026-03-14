import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  archiveBillMutation,
  createBillMutation,
  deleteBillMutation,
  getBillInstanceQueryKey,
  updateBillInstanceMutation,
  updateBillMutation
} from '@/api/generated/@tanstack/react-query.gen'
import type {
  ArchiveBillRequest,
  ArchiveBillResponse,
  CreateBillRequest,
  CreateBillResponse,
  UpdateBillInstanceRequest,
  UpdateBillInstanceResponse,
  UpdateBillRequest,
  UpdateBillResponse
} from '@/api/generated/types.gen'
import { toApiDate, toApiDateRequired } from '@/hooks/api/date-normalization'
import { invalidateByOperation } from '../invalidate-by-operation'
import type { MutationCallbacks } from '../types'

type BillCreateVariables = {
  householdId: string
  userId?: string | null
} & Omit<CreateBillRequest, 'startDate' | 'endDate' | 'lastPaymentDate'> & {
    startDate: string | Date
    endDate?: string | Date | null
    lastPaymentDate?: string | Date
  }
type BillUpdateVariables = {
  id: string
  userId?: string | null
} & Omit<UpdateBillRequest, 'startDate' | 'endDate' | 'lastPaymentDate'> & {
    startDate?: string | Date
    endDate?: string | Date | null
    lastPaymentDate?: string | Date
  }
type BillDeleteVariables = {
  id: string
  userId?: string | null
}
type BillArchiveVariables = {
  id: string
  archived: ArchiveBillRequest['archived']
  userId?: string | null
}
type BillInstanceUpdateVariables = {
  id: string
  userId?: string | null
} & Omit<UpdateBillInstanceRequest, 'dueDate'> & {
    dueDate?: string | Date
  }

/**
 * Hook to create a new bill
 */
export function useCreateBill(
  callbacks?: MutationCallbacks<CreateBillResponse, BillCreateVariables>
) {
  const queryClient = useQueryClient()
  const mutationOptions = createBillMutation()
  return useMutation<CreateBillResponse, Error, BillCreateVariables>({
    mutationFn: async (variables: BillCreateVariables) => {
      const {
        householdId,
        userId: _userId,
        startDate,
        endDate,
        lastPaymentDate,
        ...rest
      } = variables
      const body = {
        ...rest,
        startDate: toApiDateRequired(startDate),
        endDate: toApiDate(endDate),
        lastPaymentDate: toApiDate(lastPaymentDate)
      }
      const mutationFn = mutationOptions.mutationFn
      if (!mutationFn) throw new Error('Missing createBill mutation function')
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
      invalidateByOperation(queryClient, 'listBills')
      invalidateByOperation(queryClient, 'listBillInstances')
      callbacks?.onSuccess?.(data, variables)
    },
    onError: (error, variables) => callbacks?.onError?.(error, variables)
  })
}

/**
 * Hook to update an existing bill
 */
export function useUpdateBill(
  callbacks?: MutationCallbacks<UpdateBillResponse, BillUpdateVariables>
) {
  const queryClient = useQueryClient()
  const mutationOptions = updateBillMutation()
  return useMutation<UpdateBillResponse, Error, BillUpdateVariables>({
    mutationFn: async (variables: BillUpdateVariables) => {
      const {
        id,
        userId: _userId,
        startDate,
        endDate,
        lastPaymentDate,
        ...rest
      } = variables
      const body = {
        ...rest,
        startDate: toApiDate(startDate),
        endDate: toApiDate(endDate),
        lastPaymentDate: toApiDate(lastPaymentDate)
      }
      const mutationFn = mutationOptions.mutationFn
      if (!mutationFn) throw new Error('Missing updateBill mutation function')
      return mutationFn(
        {
          path: {
            billId: id
          },
          body
        },
        {} as never
      )
    },
    onSuccess: (data, variables) => {
      invalidateByOperation(queryClient, 'listBills')
      invalidateByOperation(queryClient, 'listBillInstances')
      queryClient.invalidateQueries({
        queryKey: getBillInstanceQueryKey({
          path: {
            instanceId: variables.id
          }
        })
      })
      callbacks?.onSuccess?.(data, variables)
    },
    onError: (error, variables) => callbacks?.onError?.(error, variables)
  })
}

/**
 * Hook to delete a bill
 */
export function useDeleteBill(
  callbacks?: MutationCallbacks<unknown, BillDeleteVariables>
) {
  const queryClient = useQueryClient()
  const mutationOptions = deleteBillMutation()
  return useMutation<unknown, Error, BillDeleteVariables>({
    mutationFn: async (variables: BillDeleteVariables) =>
      (() => {
        const mutationFn = mutationOptions.mutationFn
        if (!mutationFn) throw new Error('Missing deleteBill mutation function')
        return mutationFn(
          {
            path: {
              billId: variables.id
            }
          },
          {} as never
        )
      })(),
    onSuccess: (data, variables) => {
      invalidateByOperation(queryClient, 'listBills')
      invalidateByOperation(queryClient, 'listBillInstances')
      callbacks?.onSuccess?.(data, variables)
    },
    onError: (error, variables) => callbacks?.onError?.(error, variables)
  })
}

/**
 * Hook to archive or unarchive a bill
 */
export function useArchiveBill(
  callbacks?: MutationCallbacks<ArchiveBillResponse, BillArchiveVariables>
) {
  const queryClient = useQueryClient()
  const mutationOptions = archiveBillMutation()
  return useMutation<ArchiveBillResponse, Error, BillArchiveVariables>({
    mutationFn: async (variables: BillArchiveVariables) =>
      (() => {
        const mutationFn = mutationOptions.mutationFn
        if (!mutationFn)
          throw new Error('Missing archiveBill mutation function')
        return mutationFn(
          {
            path: {
              billId: variables.id
            },
            body: {
              archived: variables.archived
            }
          },
          {} as never
        )
      })(),
    onSuccess: (data, variables) => {
      invalidateByOperation(queryClient, 'listBills')
      invalidateByOperation(queryClient, 'listBillInstances')
      queryClient.invalidateQueries({
        queryKey: getBillInstanceQueryKey({
          path: {
            instanceId: variables.id
          }
        })
      })
      callbacks?.onSuccess?.(data, variables)
    },
    onError: (error, variables) => callbacks?.onError?.(error, variables)
  })
}

/**
 * Hook to update a single bill instance or propagate changes using updateType.
 */
export function useUpdateBillInstance(
  callbacks?: MutationCallbacks<
    UpdateBillInstanceResponse,
    BillInstanceUpdateVariables
  >
) {
  const queryClient = useQueryClient()
  const mutationOptions = updateBillInstanceMutation()

  return useMutation<
    UpdateBillInstanceResponse,
    Error,
    BillInstanceUpdateVariables
  >({
    mutationFn: async (variables: BillInstanceUpdateVariables) => {
      const { id, userId: _userId, dueDate, ...rest } = variables
      const body = {
        ...rest,
        dueDate: toApiDate(dueDate)
      }
      const mutationFn = mutationOptions.mutationFn
      if (!mutationFn) {
        throw new Error('Missing updateBillInstance mutation function')
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
      invalidateByOperation(queryClient, 'listBills')
      invalidateByOperation(queryClient, 'listBillInstances')
      queryClient.invalidateQueries({
        queryKey: getBillInstanceQueryKey({
          path: {
            instanceId: variables.id
          }
        })
      })
      callbacks?.onSuccess?.(data, variables)
    },
    onError: (error, variables) => callbacks?.onError?.(error, variables)
  })
}
