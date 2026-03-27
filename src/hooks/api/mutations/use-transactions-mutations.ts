import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  cloneTransactionMutation,
  createTransactionMutation,
  deleteTransactionMutation,
  getTransactionQueryKey,
  updateTransactionMutation
} from '@/api/generated/@tanstack/react-query.gen'
import type {
  CloneTransactionResponse,
  CreateTransactionRequest,
  CreateTransactionResponse,
  DeleteTransactionResponse,
  UpdateTransactionRequest,
  UpdateTransactionResponse
} from '@/api/generated/types.gen'
import { toApiDate, toApiDateRequired } from '@/hooks/api/date-normalization'
import { invalidateByOperation } from '../invalidate-by-operation'
import type { MutationCallbacks } from '../types'

type CreateTransactionVariables = {
  userId?: string | null
} & Omit<CreateTransactionRequest, 'date'> & {
    date: string | Date
  }
type UpdateTransactionVariables = {
  id: string
  userId?: string | null
} & Omit<UpdateTransactionRequest, 'date'> & {
    date?: string | Date
  }
type TransactionIdVariables = {
  id: string
  userId?: string | null
}

/**
 * Hook to create a new transaction
 */
export function useCreateTransaction(
  callbacks?: MutationCallbacks<
    CreateTransactionResponse,
    CreateTransactionVariables
  >
) {
  const queryClient = useQueryClient()
  const mutationOptions = createTransactionMutation()
  return useMutation<
    CreateTransactionResponse,
    Error,
    CreateTransactionVariables
  >({
    mutationFn: async (variables: CreateTransactionVariables) => {
      const { userId: _userId, date, ...rest } = variables
      const body = {
        ...rest,
        date: toApiDateRequired(date)
      }
      const mutationFn = mutationOptions.mutationFn
      if (!mutationFn)
        throw new Error('Missing createTransaction mutation function')
      return mutationFn(
        {
          body
        },
        {} as never
      )
    },
    onSuccess: (data, variables) => {
      invalidateByOperation(queryClient, 'listTransactions')
      invalidateByOperation(queryClient, 'getHouseholdPeriodSummary')
      invalidateByOperation(queryClient, 'listBudgets')
      invalidateByOperation(queryClient, 'getUnallocatedFunds')
      invalidateByOperation(queryClient, 'listAccounts')
      if (variables.instanceId) {
        invalidateByOperation(queryClient, 'listIncomeInstances')
      }
      callbacks?.onSuccess?.(data, variables)
    },
    onError: (error, variables) => callbacks?.onError?.(error, variables)
  })
}

/**
 * Hook to update an existing transaction
 */
export function useUpdateTransaction(
  callbacks?: MutationCallbacks<
    UpdateTransactionResponse,
    UpdateTransactionVariables
  >
) {
  const queryClient = useQueryClient()
  const mutationOptions = updateTransactionMutation()
  return useMutation<
    UpdateTransactionResponse,
    Error,
    UpdateTransactionVariables
  >({
    mutationFn: async (variables: UpdateTransactionVariables) => {
      const { id, userId: _userId, date, ...rest } = variables
      const body = {
        ...rest,
        date: toApiDate(date)
      }
      const mutationFn = mutationOptions.mutationFn
      if (!mutationFn)
        throw new Error('Missing updateTransaction mutation function')
      return mutationFn(
        {
          path: {
            transactionId: id
          },
          body
        },
        {} as never
      )
    },
    onSuccess: (data, variables) => {
      invalidateByOperation(queryClient, 'listTransactions')
      invalidateByOperation(queryClient, 'getHouseholdPeriodSummary')
      invalidateByOperation(queryClient, 'listBudgets')
      invalidateByOperation(queryClient, 'getUnallocatedFunds')
      invalidateByOperation(queryClient, 'listAccounts')
      queryClient.invalidateQueries({
        queryKey: getTransactionQueryKey({
          path: {
            transactionId: variables.id
          }
        })
      })
      callbacks?.onSuccess?.(data, variables)
    },
    onError: (error, variables) => callbacks?.onError?.(error, variables)
  })
}

/**
 * Hook to delete a transaction
 */
export function useDeleteTransaction(
  callbacks?: MutationCallbacks<
    DeleteTransactionResponse,
    TransactionIdVariables
  >
) {
  const queryClient = useQueryClient()
  const mutationOptions = deleteTransactionMutation()
  return useMutation<DeleteTransactionResponse, Error, TransactionIdVariables>({
    mutationFn: async (variables: TransactionIdVariables) =>
      (() => {
        const mutationFn = mutationOptions.mutationFn
        if (!mutationFn)
          throw new Error('Missing deleteTransaction mutation function')
        return mutationFn(
          {
            path: {
              transactionId: variables.id
            }
          },
          {} as never
        )
      })(),
    onSuccess: (data, variables) => {
      invalidateByOperation(queryClient, 'listTransactions')
      invalidateByOperation(queryClient, 'getHouseholdPeriodSummary')
      invalidateByOperation(queryClient, 'listBudgets')
      invalidateByOperation(queryClient, 'getUnallocatedFunds')
      invalidateByOperation(queryClient, 'listAccounts')
      callbacks?.onSuccess?.(data, variables)
    },
    onError: (error, variables) => callbacks?.onError?.(error, variables)
  })
}

/**
 * Hook to clone a transaction
 */
export function useCloneTransaction(
  callbacks?: MutationCallbacks<
    CloneTransactionResponse,
    TransactionIdVariables
  >
) {
  const queryClient = useQueryClient()
  const mutationOptions = cloneTransactionMutation()
  return useMutation<CloneTransactionResponse, Error, TransactionIdVariables>({
    mutationFn: async (variables: TransactionIdVariables) =>
      (() => {
        const mutationFn = mutationOptions.mutationFn
        if (!mutationFn)
          throw new Error('Missing cloneTransaction mutation function')
        return mutationFn(
          {
            path: {
              transactionId: variables.id
            },
            body: {}
          },
          {} as never
        )
      })(),
    onSuccess: (data, variables) => {
      invalidateByOperation(queryClient, 'listTransactions')
      invalidateByOperation(queryClient, 'getHouseholdPeriodSummary')
      invalidateByOperation(queryClient, 'listBudgets')
      invalidateByOperation(queryClient, 'getUnallocatedFunds')
      invalidateByOperation(queryClient, 'listAccounts')
      callbacks?.onSuccess?.(data, variables)
    },
    onError: (error, variables) => callbacks?.onError?.(error, variables)
  })
}
