import { createFileRoute } from '@tanstack/react-router'
import {
  AlertTriangleIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  ClockIcon,
  Eye,
  FileText,
  PlusIcon
} from 'lucide-react'
import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  type BillPaymentHandling,
  type BillSplit,
  RecurrenceType
} from '@/api/generated/types.gen'
import { DataTable, useDataTable } from '@/components/data-table'
import {
  PageLayout,
  type PageLayoutProps
} from '@/components/page-layout/page-layout'
import { Tabs, TabsList, TabsTrigger } from '@/components/tabs/tabs'
import { useAuth } from '@/contexts/auth-context'
import { useDrawer } from '@/drawers'
import { NoData } from '@/features/no-data/no-data'
import {
  useAccountsList,
  useBillInstancesList,
  useBillInstancesSummary,
  useBillsList,
  useBudgetsList,
  useCategoriesList,
  useDeleteBill
} from '@/hooks/api'
import { useDateRange } from '@/hooks/use-date-range'
import { accountsById } from '@/lib/accounts'
import { getErrorMessage } from '@/lib/api-error'
import {
  getAmountBounds,
  readDateRangeFilter,
  readSingleSelectFilter
} from '@/lib/column-filter-utils'
import {
  billSplitBudgetDisplayName,
  billSplitCategoryDisplayName,
  billSplitsBudgetSearchBlob,
  billSplitsCategorySearchBlob,
  billSplitsTooltipSummary
} from '@/lib/split-line-labels'

import {
  BILL_BASIS_NO_ACCOUNT_FILTER_VALUE,
  BILL_BASIS_NO_BUDGET_FILTER_VALUE,
  BILL_BASIS_NO_CATEGORY_FILTER_VALUE,
  type BillBasisLabelLookup,
  type BillBasisRow,
  createBillBasisColumns
} from './-components/bill-basis-table'
import {
  type BillOverviewRow,
  type BillOverviewStatus,
  createBillOverviewColumns,
  type LabelLookup,
  mapBillOverviewStatus
} from './-components/bill-overview-table'

export const Route = createFileRoute('/_authenticated/bills/')({
  component: BillsPage
})

type BillTab = 'overview' | 'basis'

const EMPTY_OVERVIEW_ROWS: BillOverviewRow[] = []
const EMPTY_BASIS_ROWS: BillBasisRow[] = []

function billSplitFilterFields(
  splits: BillSplit[] | undefined,
  uncategorizedLabel: string,
  categoryById: Map<string, string>,
  budgetById: Map<string, string>
): {
  splitBudgetIds: string[]
  splitCategoryIds: string[]
  splitCategoryLabels: Record<string, string>
  splitBudgetLabels: Record<string, string>
} {
  const list = splits ?? []
  const splitBudgetIds = [
    ...new Set(
      list
        .map((s) => s.budgetId ?? s.budget?.id)
        .filter((id): id is string => Boolean(id))
    )
  ]
  const splitCategoryLabels: Record<string, string> = {}
  for (const s of list) {
    const cid = s.categoryId ?? s.category?.id
    if (!cid) continue
    if (splitCategoryLabels[cid] === undefined) {
      splitCategoryLabels[cid] = billSplitCategoryDisplayName(
        s,
        categoryById,
        uncategorizedLabel
      )
    }
  }
  const splitBudgetLabels: Record<string, string> = {}
  for (const s of list) {
    const bid = s.budgetId ?? s.budget?.id
    if (!bid) continue
    if (splitBudgetLabels[bid] === undefined) {
      const label = billSplitBudgetDisplayName(s, budgetById)
      splitBudgetLabels[bid] = label || bid
    }
  }
  return {
    splitBudgetIds,
    splitCategoryIds: Object.keys(splitCategoryLabels),
    splitCategoryLabels,
    splitBudgetLabels
  }
}

function BillsPage() {
  const { userId, householdId } = useAuth()

  const { data: bills = [], isLoading: billsLoading } = useBillsList({
    householdId,
    userId,
    enabled: !!householdId
  })

  const { data: accounts = [] } = useAccountsList({
    householdId,
    userId,
    enabled: !!householdId,
    excludeArchived: true
  })

  const { data: budgets = [] } = useBudgetsList({
    householdId,
    userId,
    enabled: !!householdId
  })

  const { data: categories = [] } = useCategoriesList({
    householdId,
    userId,
    enabled: !!householdId
  })

  return (
    <BillsPageContent
      householdId={householdId}
      bills={bills}
      accounts={accounts}
      budgets={budgets}
      categories={categories}
      billsLoading={billsLoading}
    />
  )
}

interface BillsPageContentProps {
  householdId: string | null | undefined
  bills: ReturnType<typeof useBillsList>['data'] & {}
  accounts: ReturnType<typeof useAccountsList>['data'] & {}
  budgets: ReturnType<typeof useBudgetsList>['data'] & {}
  categories: ReturnType<typeof useCategoriesList>['data'] & {}
  billsLoading: boolean
}

function BillsPageContent({
  householdId,
  bills,
  accounts,
  budgets,
  categories,
  billsLoading
}: BillsPageContentProps) {
  const { t } = useTranslation()
  const { userId } = useAuth()
  const { openDrawer } = useDrawer()
  const { mutate: deleteBill } = useDeleteBill()
  const { dateFrom, dateTo } = useDateRange()
  const [tab, setTab] = useState<BillTab>('overview')

  const accountById = useMemo(
    () => accountsById(accounts),
    [
      accounts
    ]
  )

  const budgetById = useMemo(
    () =>
      new Map(
        budgets.map((b) => [
          b.id,
          b.name
        ])
      ),
    [
      budgets
    ]
  )

  const categoryById = useMemo(
    () =>
      new Map(
        categories.map((c) => [
          c.id,
          c.name
        ])
      ),
    [
      categories
    ]
  )

  const recipientMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const bill of bills) {
      if (bill.recipient) {
        map.set(bill.recipient.id, bill.recipient.name ?? '')
      }
    }
    return map
  }, [
    bills
  ])

  const {
    data: rawInstances = [],
    isLoading: instancesLoading,
    isError: instancesError
  } = useBillInstancesList({
    householdId,
    dateFrom,
    dateTo,
    enabled: !!householdId && bills.length > 0
  })
  const isOverviewLoading = bills.length > 0 && instancesLoading
  const hasOverviewError = bills.length > 0 && instancesError

  const overviewRows = useMemo(() => {
    if (rawInstances.length === 0) return EMPTY_OVERVIEW_ROWS

    return rawInstances.map((inst) => {
      const hasTransaction = !!inst.transaction?.id
      const uncategorized = t('common.uncategorized')
      const {
        splitBudgetIds,
        splitCategoryIds,
        splitCategoryLabels,
        splitBudgetLabels
      } = billSplitFilterFields(
        inst.splits,
        uncategorized,
        categoryById,
        budgetById
      )
      const splitPrefillLines = (inst.splits ?? []).map((s) => ({
        subtitle: s.subtitle ?? '',
        amount: s.amount,
        budgetId: s.budgetId ?? s.budget?.id ?? null,
        categoryId: s.categoryId ?? s.category?.id ?? ''
      }))

      return {
        id: inst.id,
        billId: inst.bill?.id ?? null,
        dueDate: inst.dueDate,
        billName: inst.name,
        billSeriesName: inst.bill?.name ?? null,
        status: mapBillOverviewStatus(inst.status),
        transactionConnected: hasTransaction,
        amount: inst.amount,
        paymentHandling: inst.paymentHandling as
          | BillPaymentHandling
          | null
          | undefined,
        accountId: inst.account?.id ?? null,
        accountName:
          accountById.get(inst.account?.id ?? '') ?? t('common.uncategorized'),
        budgetId: inst.budget?.id ?? null,
        budgetName:
          budgetById.get(inst.budget?.id ?? '') ?? t('common.uncategorized'),
        categoryId: inst.category?.id ?? null,
        categoryName: inst.category?.name ?? t('common.uncategorized'),
        splitLineCount: inst.splits?.length ?? 0,
        splitBudgetIds,
        splitCategoryIds,
        splitCategoryLabels,
        splitBudgetLabels,
        splitLinesTooltip: billSplitsTooltipSummary(
          inst.splits,
          categoryById,
          budgetById,
          uncategorized
        ),
        splitCategorySearchBlob: billSplitsCategorySearchBlob(
          inst.splits,
          categoryById,
          uncategorized
        ),
        splitBudgetSearchBlob: billSplitsBudgetSearchBlob(
          inst.splits,
          budgetById
        ),
        splitPrefillLines,
        recipientId: inst.recipient.id,
        recipientName: inst.recipient.name ?? ''
      } satisfies BillOverviewRow
    })
  }, [
    rawInstances,
    accountById,
    budgetById,
    categoryById,
    t
  ])

  const handleDeleteBasisBill = useCallback(
    (billId: string) => {
      if (!window.confirm(t('bills.basisData.rowMenu.deleteConfirm'))) return
      deleteBill(
        {
          id: billId,
          userId
        },
        {
          onSuccess: () => toast.success(t('bills.deleteSuccess')),
          onError: (err) => toast.error(getErrorMessage(err))
        }
      )
    },
    [
      deleteBill,
      t,
      userId
    ]
  )

  const overviewCategoryLookup = useMemo(() => {
    const m = new Map<string, string>(categoryById)
    for (const r of overviewRows) {
      if (r.categoryId) {
        m.set(r.categoryId, r.categoryName)
      }
      for (const [id, label] of Object.entries(r.splitCategoryLabels)) {
        m.set(id, label)
      }
    }
    return m
  }, [
    categoryById,
    overviewRows
  ])

  const labelLookupRef = useRef<LabelLookup>({
    accounts: new Map(),
    budgets: new Map(),
    categories: new Map(),
    recipients: new Map()
  })
  labelLookupRef.current = {
    accounts: accountById,
    budgets: budgetById,
    categories: overviewCategoryLookup,
    recipients: recipientMap
  }

  const overviewColumns = useMemo(
    () =>
      createBillOverviewColumns({
        t,
        labelLookupRef,
        onEditBillInstance: (instanceId) =>
          openDrawer('editBillInstance', {
            instanceId
          }),
        onCreateTransaction: (row) =>
          openDrawer('createTransaction', {
            billInstance: {
              instanceId: row.id,
              name: row.billName,
              amount: row.amount,
              date: row.dueDate,
              accountId: row.accountId,
              categoryId: row.categoryId,
              budgetId: row.budgetId,
              recipientId: row.recipientId,
              splits:
                row.splitPrefillLines.length > 0
                  ? row.splitPrefillLines
                  : undefined
            }
          })
      }),
    [
      t,
      openDrawer
    ]
  )

  const {
    table: overviewTable,
    globalFilter: overviewGlobalFilter,
    setGlobalFilter: setOverviewGlobalFilter,
    columnFilters: overviewColumnFilters,
    setColumnFilters: setOverviewColumnFilters,
    activeFilters: overviewActiveFilters
  } = useDataTable({
    data: overviewRows,
    columns: overviewColumns,
    initialSorting: [
      {
        id: 'dueDate',
        desc: false
      }
    ]
  })

  const overviewFilteredRowCount =
    overviewTable.getFilteredRowModel().rows.length
  const overviewTotalRowCount = overviewRows.length
  const overviewDateRangeFilter = useMemo(
    () => readDateRangeFilter(overviewColumnFilters, 'dueDate'),
    [
      overviewColumnFilters
    ]
  )
  const overviewAccountFilter = useMemo(
    () => readSingleSelectFilter(overviewColumnFilters, 'account'),
    [
      overviewColumnFilters
    ]
  )
  const overviewBudgetFilter = useMemo(
    () => readSingleSelectFilter(overviewColumnFilters, 'budget'),
    [
      overviewColumnFilters
    ]
  )
  const canUseOverviewSummary = useMemo(
    () =>
      overviewColumnFilters.every((filter) =>
        [
          'dueDate',
          'account',
          'budget'
        ].includes(filter.id)
      ),
    [
      overviewColumnFilters
    ]
  )
  const {
    data: overviewSummary,
    isLoading: summaryLoading,
    isError: summaryError
  } = useBillInstancesSummary({
    householdId,
    accountId: overviewAccountFilter,
    budgetId: overviewBudgetFilter,
    dateFrom: overviewDateRangeFilter?.from ?? dateFrom,
    dateTo: overviewDateRangeFilter?.to ?? dateTo,
    enabled: !!householdId && canUseOverviewSummary
  })
  const effectiveOverviewLoading =
    isOverviewLoading || (overviewTotalRowCount > 0 && summaryLoading)
  const effectiveOverviewError =
    hasOverviewError || (overviewTotalRowCount > 0 && summaryError)
  const fallbackOverviewCounts = useMemo(
    () =>
      overviewTable.getFilteredRowModel().rows.reduce(
        (counts, row) => {
          counts[row.original.status] += 1
          return counts
        },
        {
          upcoming: 0,
          overdue: 0,
          handled: 0,
          paid: 0
        } satisfies Record<BillOverviewStatus, number>
      ),
    [
      overviewTable
    ]
  )
  const summaryCounts =
    canUseOverviewSummary && overviewSummary
      ? {
          upcoming: overviewSummary.upcomingCount,
          overdue: overviewSummary.overdueCount,
          handled: overviewSummary.handledCount,
          paid: overviewSummary.paidCount
        }
      : fallbackOverviewCounts

  const overviewFilterDisabled =
    overviewTotalRowCount === 0 ||
    effectiveOverviewLoading ||
    effectiveOverviewError

  const availableOverviewStatuses = useMemo(
    () =>
      (
        [
          'overdue',
          'upcoming',
          'handled',
          'paid'
        ] as const
      ).map((s) => ({
        value: s,
        label: t(`bills.status_.${s}`)
      })),
    [
      t
    ]
  )

  const availableHandlings = useMemo(() => {
    const seen = new Set<BillPaymentHandling>()
    for (const row of overviewRows) {
      if (row.paymentHandling) seen.add(row.paymentHandling)
    }
    return [
      ...seen
    ].map((h) => ({
      value: h,
      label: t(`bills.paymentHandling.${h}`)
    }))
  }, [
    overviewRows,
    t
  ])

  const availableOverviewAccounts = useMemo(() => {
    const seen = new Map<string, string>()
    for (const row of overviewRows) {
      if (row.accountId && !seen.has(row.accountId)) {
        seen.set(row.accountId, row.accountName)
      }
    }
    return [
      ...seen
    ].map(([value, label]) => ({
      value,
      label
    }))
  }, [
    overviewRows
  ])

  const availableOverviewBudgets = useMemo(() => {
    const seen = new Map<string, string>()
    for (const row of overviewRows) {
      if (row.budgetId && !seen.has(row.budgetId)) {
        seen.set(row.budgetId, row.budgetName)
      }
      for (const bid of row.splitBudgetIds) {
        if (!seen.has(bid)) {
          seen.set(bid, row.splitBudgetLabels[bid] ?? budgetById.get(bid) ?? bid)
        }
      }
    }
    return [
      ...seen
    ].map(([value, label]) => ({
      value,
      label
    }))
  }, [
    overviewRows,
    budgetById
  ])


  const availableOverviewCategories = useMemo(() => {
    const seen = new Map<string, string>()
    for (const row of overviewRows) {
      if (row.categoryId && !seen.has(row.categoryId)) {
        seen.set(row.categoryId, row.categoryName)
      }
      for (const cid of row.splitCategoryIds) {
        if (!seen.has(cid)) {
          seen.set(cid, row.splitCategoryLabels[cid] ?? cid)
        }
      }
    }
    return [
      ...seen
    ].map(([value, label]) => ({
      value,
      label
    }))
  }, [
    overviewRows
  ])

  const availableOverviewRecipients = useMemo(() => {
    const seen = new Map<string, string>()
    for (const row of overviewRows) {
      if (!seen.has(row.recipientId)) {
        seen.set(row.recipientId, row.recipientName)
      }
    }
    return [
      ...seen
    ].map(([value, label]) => ({
      value,
      label
    }))
  }, [
    overviewRows
  ])

  const overviewAmountBounds = useMemo(
    () => getAmountBounds(overviewRows),
    [
      overviewRows
    ]
  )

  const handleOverviewFilterClick = useCallback(() => {
    openDrawer('billOverviewFilterDrawer', {
      columnFilters: overviewColumnFilters,
      onApply: setOverviewColumnFilters,
      availableStatuses: availableOverviewStatuses,
      availableHandlings,
      availableAccounts: availableOverviewAccounts,
      availableBudgets: availableOverviewBudgets,
      availableCategories: availableOverviewCategories,
      availableRecipients: availableOverviewRecipients,
      amountBounds: overviewAmountBounds
    })
  }, [
    openDrawer,
    overviewColumnFilters,
    setOverviewColumnFilters,
    availableOverviewStatuses,
    availableHandlings,
    availableOverviewAccounts,
    availableOverviewBudgets,
    availableOverviewCategories,
    availableOverviewRecipients,
    overviewAmountBounds
  ])

  const overviewEmptyMessage = useMemo((): ReactNode | undefined => {
    if (effectiveOverviewLoading) return t('common.loading')
    if (effectiveOverviewError) return t('common.error')
    if (overviewTotalRowCount === 0) return undefined
    if (overviewFilteredRowCount === 0) return t('common.noResultsFound')
    return undefined
  }, [
    effectiveOverviewError,
    effectiveOverviewLoading,
    overviewFilteredRowCount,
    overviewTotalRowCount,
    t
  ])

  const basisRows = useMemo(() => {
    if (bills.length === 0) return EMPTY_BASIS_ROWS

    return bills.map((bill) => {
      const uncategorized = t('common.uncategorized')
      const {
        splitBudgetIds,
        splitCategoryIds,
        splitCategoryLabels,
        splitBudgetLabels
      } = billSplitFilterFields(
        bill.splits,
        uncategorized,
        categoryById,
        budgetById
      )

      return {
        id: bill.id,
        name: bill.name,
        recurrenceType: bill.recurrenceType,
        customIntervalDays: bill.customIntervalDays ?? null,
        dueDate: bill.dueDate,
        endDate: bill.endDate,
        amount: bill.estimatedAmount,
        paymentHandling: bill.paymentHandling as
          | BillPaymentHandling
          | null
          | undefined,
        accountId: bill.account?.id ?? null,
        accountName:
          accountById.get(bill.account?.id ?? '') ?? t('common.uncategorized'),
        budgetId: bill.budget?.id ?? null,
        budgetName:
          budgetById.get(bill.budget?.id ?? '') ?? t('common.uncategorized'),
        categoryId: bill.category?.id ?? null,
        categoryName: bill.category?.name ?? t('common.uncategorized'),
        splitLineCount: bill.splits?.length ?? 0,
        splitBudgetIds,
        splitCategoryIds,
        splitCategoryLabels,
        splitBudgetLabels,
        splitLinesTooltip: billSplitsTooltipSummary(
          bill.splits,
          categoryById,
          budgetById,
          uncategorized
        ),
        splitCategorySearchBlob: billSplitsCategorySearchBlob(
          bill.splits,
          categoryById,
          uncategorized
        ),
        splitBudgetSearchBlob: billSplitsBudgetSearchBlob(
          bill.splits,
          budgetById
        ),
        recipientId: bill.recipient.id,
        recipientName: bill.recipient.name ?? '',
        numberOfRevisions: bill.numberOfRevisions
      } satisfies BillBasisRow
    })
  }, [
    bills,
    accountById,
    budgetById,
    categoryById,
    t
  ])

  const basisLabelLookupRef = useRef<BillBasisLabelLookup>({
    accounts: new Map(),
    budgets: new Map(),
    categories: new Map(),
    recipients: new Map()
  })
  const basisCategoryLookup = useMemo(() => {
    const m = new Map<string, string>([
      ...categoryById,
      [
        BILL_BASIS_NO_CATEGORY_FILTER_VALUE,
        t('common.uncategorized')
      ]
    ])
    for (const row of basisRows) {
      const cv = row.categoryId ?? BILL_BASIS_NO_CATEGORY_FILTER_VALUE
      m.set(cv, row.categoryName)
      for (const [id, label] of Object.entries(row.splitCategoryLabels)) {
        m.set(id, label)
      }
    }
    return m
  }, [
    basisRows,
    categoryById,
    t
  ])

  basisLabelLookupRef.current = {
    accounts: new Map([
      ...accountById,
      [
        BILL_BASIS_NO_ACCOUNT_FILTER_VALUE,
        t('common.uncategorized')
      ]
    ]),
    budgets: new Map([
      ...budgetById,
      [
        BILL_BASIS_NO_BUDGET_FILTER_VALUE,
        t('common.uncategorized')
      ]
    ]),
    categories: basisCategoryLookup,
    recipients: recipientMap
  }

  const basisColumns = useMemo(
    () =>
      createBillBasisColumns({
        t,
        labelLookupRef: basisLabelLookupRef,
        onViewRevisions: (billId) =>
          openDrawer('billRevisions', {
            billId,
            name: bills.find((b) => b.id === billId)?.name ?? ''
          }),
        onEditUpcoming: (billId) =>
          openDrawer('editBillBlueprintUpcoming', {
            billId
          }),
        onEditAll: (billId) =>
          openDrawer('editBillBlueprintAll', {
            billId
          }),
        onDeleteBill: handleDeleteBasisBill
      }),
    [
      t,
      openDrawer,
      handleDeleteBasisBill,
      bills
    ]
  )

  const {
    table: basisTable,
    globalFilter: basisGlobalFilter,
    setGlobalFilter: setBasisGlobalFilter,
    columnFilters: basisColumnFilters,
    setColumnFilters: setBasisColumnFilters,
    activeFilters: basisActiveFilters
  } = useDataTable({
    data: basisRows,
    columns: basisColumns,
    initialSorting: [
      {
        id: 'name',
        desc: false
      }
    ]
  })

  const basisFilteredCount = basisTable.getRowModel().rows.length
  const basisAmountBounds = useMemo(
    () => getAmountBounds(basisRows),
    [
      basisRows
    ]
  )

  const basisFilterOptions = useMemo(() => {
    const recurrencesSeen = new Set<RecurrenceType>()
    const handlingsSeen = new Set<BillPaymentHandling>()
    const accountsSeen = new Map<string, string>()
    const budgetsSeen = new Map<string, string>()
    const categoriesSeen = new Map<string, string>()
    const recipientsSeen = new Map<string, string>()

    for (const row of basisRows) {
      recurrencesSeen.add(row.recurrenceType)
      if (row.paymentHandling) {
        handlingsSeen.add(row.paymentHandling)
      }

      const accountValue = row.accountId ?? BILL_BASIS_NO_ACCOUNT_FILTER_VALUE
      if (!accountsSeen.has(accountValue)) {
        accountsSeen.set(accountValue, row.accountName)
      }

      const budgetValue = row.budgetId ?? BILL_BASIS_NO_BUDGET_FILTER_VALUE
      if (!budgetsSeen.has(budgetValue)) {
        budgetsSeen.set(budgetValue, row.budgetName)
      }
      for (const bid of row.splitBudgetIds) {
        if (!budgetsSeen.has(bid)) {
          budgetsSeen.set(bid, row.splitBudgetLabels[bid] ?? budgetById.get(bid) ?? bid)
        }
      }

      const categoryValue =
        row.categoryId ?? BILL_BASIS_NO_CATEGORY_FILTER_VALUE
      if (!categoriesSeen.has(categoryValue)) {
        categoriesSeen.set(categoryValue, row.categoryName)
      }
      for (const cid of row.splitCategoryIds) {
        if (!categoriesSeen.has(cid)) {
          categoriesSeen.set(cid, row.splitCategoryLabels[cid] ?? cid)
        }
      }

      if (!recipientsSeen.has(row.recipientId)) {
        recipientsSeen.set(row.recipientId, row.recipientName)
      }
    }

    const recurrenceOrder: RecurrenceType[] = [
      RecurrenceType.NONE,
      RecurrenceType.WEEKLY,
      RecurrenceType.MONTHLY,
      RecurrenceType.QUARTERLY,
      RecurrenceType.YEARLY,
      RecurrenceType.CUSTOM
    ]

    const recurrenceLabels: Record<RecurrenceType, string> = {
      [RecurrenceType.NONE]: t('bills.basisData.recurrence.none'),
      [RecurrenceType.WEEKLY]: t('bills.basisData.recurrence.weekly'),
      [RecurrenceType.MONTHLY]: t('bills.basisData.recurrence.monthly'),
      [RecurrenceType.QUARTERLY]: t('bills.basisData.recurrence.quarterly'),
      [RecurrenceType.YEARLY]: t('bills.basisData.recurrence.yearly'),
      [RecurrenceType.CUSTOM]: t('bills.basisData.recurrence.custom', {
        days: '?'
      })
    }

    return {
      recurrences: recurrenceOrder
        .filter((value) => recurrencesSeen.has(value))
        .map((value) => ({
          value,
          label: recurrenceLabels[value]
        })),
      handlings: [
        ...handlingsSeen
      ].map((value) => ({
        value,
        label: t(`bills.paymentHandling.${value}`)
      })),
      accounts: [
        ...accountsSeen
      ].map(([value, label]) => ({
        value,
        label
      })),
      budgets: [
        ...budgetsSeen
      ].map(([value, label]) => ({
        value,
        label
      })),
      categories: [
        ...categoriesSeen
      ].map(([value, label]) => ({
        value,
        label
      })),
      recipients: [
        ...recipientsSeen
      ].map(([value, label]) => ({
        value,
        label
      }))
    }
  }, [
    basisRows,
    budgetById,
    t
  ])

  const handleBasisFilterClick = useCallback(() => {
    openDrawer('billBasisFilterDrawer', {
      columnFilters: basisColumnFilters,
      onApply: setBasisColumnFilters,
      availableRecurrences: basisFilterOptions.recurrences,
      availableHandlings: basisFilterOptions.handlings,
      availableAccounts: basisFilterOptions.accounts,
      availableBudgets: basisFilterOptions.budgets,
      availableCategories: basisFilterOptions.categories,
      availableRecipients: basisFilterOptions.recipients,
      amountBounds: basisAmountBounds
    })
  }, [
    openDrawer,
    basisColumnFilters,
    setBasisColumnFilters,
    basisFilterOptions,
    basisAmountBounds
  ])

  const openCreateBillDrawer = useCallback(() => {
    openDrawer('createBill', {})
  }, [
    openDrawer
  ])

  const showNoData = !!householdId && bills.length === 0
  const loadingHeader =
    billsLoading ||
    (bills.length > 0 && effectiveOverviewLoading && !effectiveOverviewError)
  const loadingContent =
    billsLoading || (tab === 'overview' && !showNoData && isOverviewLoading)

  const infoCards: PageLayoutProps['infoCards'] =
    effectiveOverviewLoading || effectiveOverviewError
      ? undefined
      : [
          {
            id: 'upcoming',
            color: 'gray',
            icon: (
              <CalendarClockIcon
                className="stroke-[1.5]"
                aria-hidden
              />
            ),
            label: t('bills.summary.upcoming'),
            value: summaryCounts.upcoming
          },
          {
            id: 'overdue',
            color: 'red',
            icon: (
              <AlertTriangleIcon
                className="stroke-[1.5]"
                aria-hidden
              />
            ),
            label: t('bills.summary.overdue'),
            value: summaryCounts.overdue
          },
          {
            id: 'handled',
            color: 'blue',
            icon: (
              <ClockIcon
                className="stroke-[1.5]"
                aria-hidden
              />
            ),
            label: t('bills.summary.handled'),
            value: summaryCounts.handled
          },
          {
            id: 'paid',
            color: 'green',
            icon: (
              <CheckCircle2Icon
                className="stroke-[1.5]"
                aria-hidden
              />
            ),
            label: t('bills.summary.paid'),
            value: summaryCounts.paid
          }
        ]

  return (
    <PageLayout
      title={t('bills.title')}
      description={t('bills.pageSubtitle')}
      loadingHeader={loadingHeader}
      loadingContent={loadingContent}
      infoCards={infoCards}
      tabs={
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as BillTab)}
        >
          <TabsList>
            <TabsTrigger
              value="overview"
              icon={<Eye className="size-4 stroke-[1.5]" />}
            >
              {t('bills.tabs.overview')}
            </TabsTrigger>
            <TabsTrigger
              value="basis"
              icon={<FileText className="size-4 stroke-[1.5]" />}
            >
              {t('bills.tabs.basis')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      }
    >
      {tab === 'overview' ? (
        <div className="flex min-h-0 flex-1 flex-col h-full w-full">
          {showNoData ? (
            <div className="flex flex-1 items-center justify-center">
              <NoData
                variant="no-bills"
                onAction={openCreateBillDrawer}
              />
            </div>
          ) : (
            <DataTable
              table={overviewTable}
              columns={overviewColumns}
              globalFilter={overviewGlobalFilter}
              onGlobalFilterChange={setOverviewGlobalFilter}
              filterDisabled={overviewFilterDisabled}
              onFilterClick={handleOverviewFilterClick}
              activeFilters={overviewActiveFilters}
              actionButton={{
                label: t('bills.createCTA'),
                icon: <PlusIcon />,
                onClick: openCreateBillDrawer,
                disabled: !householdId
              }}
              toolbarLabels={{
                searchPlaceholder: t('common.search'),
                filter: t('common.filter'),
                pillRemoveAriaLabel: t('common.removeFilter')
              }}
              emptyMessage={overviewEmptyMessage}
            />
          )}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col w-full h-full">
          {showNoData ? (
            <div className="flex flex-1 items-center justify-center">
              <NoData
                variant="no-bills"
                onAction={openCreateBillDrawer}
              />
            </div>
          ) : (
            <DataTable
              table={basisTable}
              columns={basisColumns}
              globalFilter={basisGlobalFilter}
              onGlobalFilterChange={setBasisGlobalFilter}
              filterDisabled={basisRows.length === 0}
              onFilterClick={handleBasisFilterClick}
              activeFilters={basisActiveFilters}
              actionButton={{
                label: t('bills.createCTA'),
                icon: <PlusIcon />,
                onClick: openCreateBillDrawer,
                disabled: !householdId
              }}
              toolbarLabels={{
                searchPlaceholder: t('common.search'),
                filter: t('common.filter'),
                pillRemoveAriaLabel: t('common.removeFilter')
              }}
              emptyMessage={
                basisFilteredCount === 0 && basisRows.length > 0
                  ? t('common.noResultsFound')
                  : undefined
              }
            />
          )}
        </div>
      )}
    </PageLayout>
  )
}
