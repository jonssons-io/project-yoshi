import { useQuery } from '@tanstack/react-query'
import {
  getBillInstanceOptions,
  getBillInstancesSummaryOptions,
  listBillInstancesOptions,
  listBillsOptions
} from '@/api/generated/@tanstack/react-query.gen'
import type {
  Bill,
  BillSplit,
  GetBillInstanceData,
  GetBillInstancesSummaryData,
  ListBillInstancesData,
  ListBillsData
} from '@/api/generated/types.gen'
import {
  fromApiDate,
  fromOptionalApiDate
} from '@/hooks/api/date-normalization'
import {
  getSyntheticSingleSplit,
  normalizeBackendSplits
} from '@/lib/split-normalization'

type ListBillsQuery = NonNullable<ListBillsData['query']>
type ListBillInstancesQuery = NonNullable<ListBillInstancesData['query']>
type GetBillInstancesSummaryQuery = GetBillInstancesSummaryData['query']

/**
 * Hook to fetch list of recurring bills for a household.
 */
export function useBillsList(params: {
  householdId?: ListBillsData['path']['householdId'] | null
  budgetId?: ListBillsQuery['budgetId'] | null
  userId?: string | null
  includeArchived?: ListBillsQuery['includeArchived']
  enabled?: boolean
}) {
  const { householdId, budgetId, includeArchived, enabled = true } = params
  return useQuery({
    ...listBillsOptions({
      path: {
        householdId: householdId ?? ''
      },
      query: {
        budgetId: budgetId || undefined,
        includeArchived
      }
    }),
    enabled: enabled && !!householdId,
    select: (response) =>
      (response.data ?? []).map((bill) => {
        const blueprint = bill as Bill & {
          splits?: BillSplit[] | null
        }
        return {
          ...bill,
          dueDate: fromApiDate(bill.dueDate),
          endDate: fromOptionalApiDate(bill.endDate ?? undefined),
          lastPaymentDate: fromOptionalApiDate(
            bill.lastPaymentDate ?? undefined
          ),
          splits: normalizeBackendSplits(blueprint.splits)
        }
      })
  })
}

/**
 * Hook to fetch bill instances with flexible household-level filters.
 */
export function useBillInstancesList(params: {
  householdId?: ListBillInstancesQuery['householdId'] | null
  billId?: ListBillInstancesQuery['billId'] | null
  transactionId?: ListBillInstancesQuery['transactionId'] | null
  budgetId?: string | null
  includeArchived?: ListBillInstancesQuery['includeArchived']
  dateFrom?: Date
  dateTo?: Date
  enabled?: boolean
}) {
  const {
    householdId,
    billId,
    transactionId,
    budgetId,
    includeArchived,
    dateFrom,
    dateTo,
    enabled = true
  } = params

  return useQuery({
    ...listBillInstancesOptions({
      query: {
        householdId: householdId ?? undefined,
        billId: billId ?? undefined,
        transactionId: transactionId ?? undefined,
        dateFrom: dateFrom?.toISOString(),
        dateTo: dateTo?.toISOString(),
        includeArchived
      }
    }),
    enabled: enabled && !!householdId,
    select: (response) =>
      (response.data ?? [])
        .map((bill) => {
          const syntheticSplit = getSyntheticSingleSplit(bill.splits)
          return {
            ...bill,
            category: bill.category ?? syntheticSplit?.category,
            splits: normalizeBackendSplits(bill.splits),
            dueDate: fromApiDate(bill.dueDate)
          }
        })
        .filter((bill) => (budgetId ? bill.budget?.id === budgetId : true))
  })
}

/**
 * Hook to fetch derived bill instance status counts for the overview cards.
 */
export function useBillInstancesSummary(params: {
  householdId?: GetBillInstancesSummaryQuery extends infer T
    ? T extends {
        householdId?: infer V
      }
      ? V | null
      : never
    : never
  billId?: GetBillInstancesSummaryQuery extends infer T
    ? T extends {
        billId?: infer V
      }
      ? V | null
      : never
    : never
  accountId?: GetBillInstancesSummaryQuery extends infer T
    ? T extends {
        accountId?: infer V
      }
      ? V | null
      : never
    : never
  budgetId?: GetBillInstancesSummaryQuery extends infer T
    ? T extends {
        budgetId?: infer V
      }
      ? V | null
      : never
    : never
  includeArchived?: GetBillInstancesSummaryQuery extends infer T
    ? T extends {
        includeArchived?: infer V
      }
      ? V
      : never
    : never
  dateFrom?: Date
  dateTo?: Date
  enabled?: boolean
}) {
  const {
    householdId,
    billId,
    accountId,
    budgetId,
    includeArchived,
    dateFrom,
    dateTo,
    enabled = true
  } = params

  return useQuery({
    ...getBillInstancesSummaryOptions({
      query: {
        householdId: householdId ?? undefined,
        billId: billId ?? undefined,
        accountId: accountId ?? undefined,
        budgetId: budgetId ?? undefined,
        includeArchived,
        dateFrom: dateFrom?.toISOString(),
        dateTo: dateTo?.toISOString()
      }
    }),
    enabled: Boolean(enabled && (householdId || billId))
  })
}

/**
 * Hook to fetch a single bill instance by ID.
 */
export function useBillInstanceById(params: {
  instanceId?: GetBillInstanceData['path']['instanceId'] | null
  enabled?: boolean
}) {
  const { instanceId, enabled = true } = params
  return useQuery({
    ...getBillInstanceOptions({
      path: {
        instanceId: instanceId ?? ''
      }
    }),
    enabled: enabled && !!instanceId,
    select: (bill) => {
      const syntheticSplit = getSyntheticSingleSplit(bill.splits)
      return {
        ...bill,
        category: bill.category ?? syntheticSplit?.category,
        splits: normalizeBackendSplits(bill.splits),
        dueDate: fromApiDate(bill.dueDate)
      }
    }
  })
}
