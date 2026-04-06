import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  archiveBillMutation,
  createBillMutation,
  deleteBillMutation,
  getBillInstanceQueryKey,
  getBillQueryKey,
  updateBillInstanceMutation,
  updateBillMutation
} from '@/api/generated/@tanstack/react-query.gen'
import {
  type ArchiveBillRequest,
  type ArchiveBillResponse,
  BlueprintPatchScope,
  type CreateBillRequest,
  type CreateBillResponse,
  type UpdateBillInstanceRequest,
  type UpdateBillInstanceResponse,
  type UpdateBillRequest,
  type UpdateBillResponse
} from '@/api/generated/types.gen'
import { toApiDate, toApiDateRequired } from '@/hooks/api/date-normalization'
import { withTitleCasedCategoryFieldsForBillBody } from '@/lib/category-name-normalize'
import { invalidateByOperation } from '../invalidate-by-operation'
import type { MutationCallbacks } from '../types'

type BillCreateVariables = {
  householdId: string
  userId?: string | null
} & Omit<CreateBillRequest, 'dueDate' | 'endDate' | 'lastPaymentDate'> & {
    dueDate: string | Date
    endDate?: string | Date | null
    lastPaymentDate?: string | Date
  }
type BillUpdateVariables = {
  id: string
  userId?: string | null
} & Omit<
  UpdateBillRequest,
  'dueDate' | 'endDate' | 'lastPaymentDate' | 'fromDate'
> & {
    dueDate?: string | Date
    endDate?: string | Date | null
    lastPaymentDate?: string | Date
    fromDate?: string | Date
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
        dueDate,
        endDate,
        lastPaymentDate,
        ...rest
      } = variables
      const body = withTitleCasedCategoryFieldsForBillBody({
        ...rest,
        dueDate: toApiDateRequired(dueDate),
        endDate: toApiDate(endDate),
        lastPaymentDate: toApiDate(lastPaymentDate)
      })
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
      invalidateByOperation(queryClient, 'getBillInstancesSummary')
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
        dueDate,
        endDate,
        lastPaymentDate,
        fromDate,
        ...rest
      } = variables
      const body = withTitleCasedCategoryFieldsForBillBody({
        ...rest,
        ...(dueDate !== undefined && dueDate !== null
          ? {
              dueDate: toApiDate(dueDate)
            }
          : {}),
        endDate: toApiDate(endDate),
        lastPaymentDate: toApiDate(lastPaymentDate),
        ...(fromDate !== undefined && fromDate !== null
          ? {
              fromDate: toApiDateRequired(fromDate)
            }
          : {})
      })
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
      invalidateByOperation(queryClient, 'getBillInstancesSummary')
      const scope = variables.updateScope
      if (
        scope === BlueprintPatchScope.ALL ||
        scope === BlueprintPatchScope.UPCOMING
      ) {
        invalidateByOperation(queryClient, 'listBillRevisions')
        void queryClient.invalidateQueries({
          queryKey: getBillQueryKey({
            path: {
              billId: variables.id
            }
          })
        })
      }
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
      invalidateByOperation(queryClient, 'getBillInstancesSummary')
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
      invalidateByOperation(queryClient, 'getBillInstancesSummary')
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
 * Hook to update a single bill instance (no propagation to other occurrences).
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
      const body = withTitleCasedCategoryFieldsForBillBody({
        ...rest,
        dueDate: toApiDate(dueDate)
      })
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
      invalidateByOperation(queryClient, 'getBillInstancesSummary')
      invalidateByOperation(queryClient, 'listCategories')
      if (variables.newRecipientName) {
        invalidateByOperation(queryClient, 'listRecipients')
      }
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
