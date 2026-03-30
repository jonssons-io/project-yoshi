import { useQuery } from '@tanstack/react-query'
import {
  getIncomeInstanceOptions,
  getIncomeOptions,
  listIncomeInstancesOptions,
  listIncomeSourcesOptions,
  listIncomesOptions
} from '@/api/generated/@tanstack/react-query.gen'
import type {
  GetIncomeData,
  GetIncomeInstanceData,
  ListIncomeInstancesData,
  ListIncomeSourcesData,
  ListIncomesData
} from '@/api/generated/types.gen'
import {
  fromApiDate,
  fromOptionalApiDate
} from '@/hooks/api/date-normalization'

type ListIncomesQuery = NonNullable<ListIncomesData['query']>

/**
 * Hook to fetch list of incomes for a budget
 */
export function useIncomeList(params: {
  householdId?: ListIncomesData['path']['householdId'] | null
  budgetId?: string | null
  userId?: string | null
  includeArchived?: ListIncomesQuery['includeArchived']
  enabled?: boolean
}) {
  const { householdId, includeArchived, enabled = true } = params
  return useQuery({
    ...listIncomesOptions({
      path: {
        householdId: householdId ?? ''
      },
      query: {
        includeArchived
      }
    }),
    enabled: enabled && !!householdId,
    select: (response) =>
      (response.data ?? []).map((income) => ({
        ...income,
        expectedDate: fromApiDate(income.expectedDate),
        endDate: fromOptionalApiDate(income.endDate ?? undefined)
      }))
  })
}

/**
 * Hook to fetch a single income by ID
 */
export function useIncomeById(params: {
  id: GetIncomeData['path']['incomeId']
  userId?: string | null
  enabled?: boolean
}) {
  const { id, enabled = true } = params
  return useQuery({
    ...getIncomeOptions({
      path: {
        incomeId: id
      }
    }),
    enabled: enabled && !!id,
    select: (income) => ({
      ...income,
      expectedDate: fromApiDate(income.expectedDate),
      endDate: fromOptionalApiDate(income.endDate ?? undefined)
    })
  })
}

/**
 * Hook to fetch instances for a specific income blueprint.
 */
export function useIncomeInstancesList(params: {
  incomeId?: ListIncomeInstancesData['path']['incomeId'] | null
  userId?: string | null
  enabled?: boolean
}) {
  const { incomeId, enabled = true } = params

  return useQuery({
    ...listIncomeInstancesOptions({
      path: {
        incomeId: incomeId ?? ''
      }
    }),
    enabled: enabled && !!incomeId,
    select: (response) =>
      (response.data ?? []).map((instance) => ({
        ...instance,
        expectedDate: fromApiDate(instance.expectedDate)
      }))
  })
}

/**
 * Hook to fetch a single income instance by ID.
 */
export function useIncomeInstanceById(params: {
  instanceId?: GetIncomeInstanceData['path']['instanceId'] | null
  userId?: string | null
  enabled?: boolean
}) {
  const { instanceId, enabled = true } = params

  return useQuery({
    ...getIncomeInstanceOptions({
      path: {
        instanceId: instanceId ?? ''
      }
    }),
    enabled: enabled && !!instanceId,
    select: (instance) => ({
      ...instance,
      expectedDate: fromApiDate(instance.expectedDate)
    })
  })
}

type ListIncomeSourcesQuery = NonNullable<ListIncomeSourcesData['query']>

/**
 * Hook to fetch income sources (payers) for a household.
 * Uses the dedicated `listIncomeSources` endpoint which includes sources
 * created both via recurring incomes and via one-off transactions.
 */
export function useIncomeSourcesList(params: {
  householdId?: ListIncomeSourcesData['path']['householdId'] | null
  userId?: string | null
  includeArchived?: ListIncomeSourcesQuery['includeArchived']
  enabled?: boolean
}) {
  const { householdId, includeArchived, enabled = true } = params

  return useQuery({
    ...listIncomeSourcesOptions({
      path: {
        householdId: householdId ?? ''
      },
      query: {
        includeArchived
      }
    }),
    enabled: enabled && !!householdId,
    select: (response) => response.data ?? []
  })
}
