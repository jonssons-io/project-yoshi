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
  CategoryType,
  IncomeInstanceStatus,
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
  useCategoriesList,
  useDeleteIncome,
  useIncomeInstancesFilteredList,
  useIncomeInstancesSummary,
  useIncomeList
} from '@/hooks/api'
import { fromApiDate } from '@/hooks/api/date-normalization'
import { useDateRange } from '@/hooks/use-date-range'
import { accountsById } from '@/lib/accounts'
import { getErrorMessage } from '@/lib/api-error'
import {
  getAmountBounds,
  readDateRangeFilter,
  readSingleSelectFilter
} from '@/lib/column-filter-utils'

import {
  createIncomeOverviewColumns,
  type IncomeOverviewRow,
  type LabelLookup
} from './-components/income-overview-table'
import {
  createIncomeSourceDataColumns,
  type IncomeSourceDataRow,
  type IncomeSourceLabelLookup
} from './-components/income-source-data-table'

export const Route = createFileRoute('/_authenticated/income/')({
  component: IncomePage
})

type IncomeTab = 'overview' | 'sourceData'

const EMPTY_ROWS: IncomeOverviewRow[] = []
const EMPTY_SOURCE_DATA_ROWS: IncomeSourceDataRow[] = []

function IncomePage() {
  const { userId, householdId } = useAuth()

  const { data: incomes = [], isLoading: incomesLoading } = useIncomeList({
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

  const { data: categories = [] } = useCategoriesList({
    householdId,
    userId,
    type: CategoryType.INCOME,
    enabled: !!householdId
  })

  return (
    <IncomePageContent
      householdId={householdId}
      incomes={incomes}
      accounts={accounts}
      categories={categories}
      incomesLoading={incomesLoading}
    />
  )
}

interface IncomePageContentProps {
  householdId: string | null | undefined
  incomes: ReturnType<typeof useIncomeList>['data'] & {}
  accounts: ReturnType<typeof useAccountsList>['data'] & {}
  categories: ReturnType<typeof useCategoriesList>['data'] & {}
  incomesLoading: boolean
}

function IncomePageContent({
  householdId,
  incomes,
  accounts,
  categories,
  incomesLoading
}: IncomePageContentProps) {
  const { t } = useTranslation()
  const { userId } = useAuth()
  const { openDrawer } = useDrawer()
  const { mutate: deleteIncome } = useDeleteIncome()
  const { dateFrom, dateTo } = useDateRange()
  const [tab, setTab] = useState<IncomeTab>('overview')

  const accountById = useMemo(
    () => accountsById(accounts),
    [
      accounts
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

  const incomeSourceById = useMemo(() => {
    const map = new Map<string, string>()
    for (const income of incomes) {
      if (income.incomeSource) {
        map.set(income.incomeSource.id, income.incomeSource.name)
      }
    }
    return map
  }, [
    incomes
  ])

  const incomeById = useMemo(
    () =>
      new Map(
        incomes.map((income) => [
          income.id,
          income.name
        ])
      ),
    [
      incomes
    ]
  )

  const {
    data: rawInstances = [],
    isLoading: instancesLoading,
    isError: instancesError
  } = useIncomeInstancesFilteredList({
    householdId,
    dateFrom,
    dateTo,
    enabled: !!householdId && incomes.length > 0
  })

  const isOverviewLoading = incomes.length > 0 && instancesLoading
  const hasOverviewError = incomes.length > 0 && instancesError

  const overviewRows = useMemo(() => {
    if (rawInstances.length === 0) return EMPTY_ROWS

    return rawInstances.map((inst) => {
      const expectedDate = fromApiDate(inst.expectedDate)

      return {
        id: inst.id,
        expectedDate,
        incomeName: inst.name,
        incomeSeriesName: inst.incomeId
          ? (incomeById.get(inst.incomeId) ?? null)
          : null,
        status: inst.status,
        transactionConnected: !!inst.transaction?.id,
        amount: inst.amount,
        accountId: inst.accountId,
        accountName:
          accountById.get(inst.accountId) ?? t('common.uncategorized'),
        categoryId: inst.categoryId ?? null,
        categoryName:
          categoryById.get(inst.categoryId ?? '') ?? t('common.uncategorized'),
        senderId: inst.incomeSourceId,
        senderName: incomeSourceById.get(inst.incomeSourceId) ?? ''
      } satisfies IncomeOverviewRow
    })
  }, [
    rawInstances,
    accountById,
    categoryById,
    incomeById,
    incomeSourceById,
    t
  ])

  const labelLookupRef = useRef<LabelLookup>({
    accounts: new Map(),
    categories: new Map(),
    senders: new Map()
  })
  labelLookupRef.current = {
    accounts: accountById,
    categories: categoryById,
    senders: incomeSourceById
  }

  const handleDeleteSourceIncome = useCallback(
    (incomeId: string) => {
      if (!window.confirm(t('income.sourceData.rowMenu.deleteConfirm'))) return
      deleteIncome(
        {
          id: incomeId,
          userId
        },
        {
          onSuccess: () => toast.success(t('income.deleteSuccess')),
          onError: (err) => toast.error(getErrorMessage(err))
        }
      )
    },
    [
      deleteIncome,
      t,
      userId
    ]
  )

  const columns = useMemo(
    () =>
      createIncomeOverviewColumns({
        t,
        labelLookupRef,
        onEditIncomeInstance: (instanceId) =>
          openDrawer('editIncomeInstance', {
            instanceId
          }),
        onCreateTransaction: (row) =>
          openDrawer('createTransaction', {
            incomeInstance: {
              instanceId: row.id,
              name: row.incomeName,
              amount: row.amount,
              date: row.expectedDate,
              accountId: row.accountId,
              categoryId: row.categoryId,
              senderName: row.senderName
            }
          })
      }),
    [
      t,
      openDrawer
    ]
  )

  const {
    table,
    globalFilter,
    setGlobalFilter,
    columnFilters,
    setColumnFilters,
    activeFilters
  } = useDataTable({
    data: overviewRows,
    columns,
    initialSorting: [
      {
        id: 'expectedDate',
        desc: false
      }
    ]
  })

  const filteredRowCount = table.getFilteredRowModel().rows.length
  const totalRowCount = overviewRows.length
  const overviewDateRangeFilter = useMemo(
    () => readDateRangeFilter(columnFilters, 'expectedDate'),
    [
      columnFilters
    ]
  )
  const overviewAccountFilter = useMemo(
    () => readSingleSelectFilter(columnFilters, 'account'),
    [
      columnFilters
    ]
  )
  const overviewCategoryFilter = useMemo(
    () => readSingleSelectFilter(columnFilters, 'category'),
    [
      columnFilters
    ]
  )
  const canUseOverviewSummary = useMemo(
    () =>
      columnFilters.every((filter) =>
        [
          'expectedDate',
          'account',
          'category'
        ].includes(filter.id)
      ),
    [
      columnFilters
    ]
  )
  const {
    data: overviewSummary,
    isLoading: summaryLoading,
    isError: summaryError
  } = useIncomeInstancesSummary({
    householdId,
    accountId: overviewAccountFilter,
    categoryId:
      overviewCategoryFilter === '__uncategorized__'
        ? undefined
        : overviewCategoryFilter,
    dateFrom: overviewDateRangeFilter?.from ?? dateFrom,
    dateTo: overviewDateRangeFilter?.to ?? dateTo,
    enabled: !!householdId && canUseOverviewSummary
  })
  const effectiveOverviewLoading =
    isOverviewLoading || (totalRowCount > 0 && summaryLoading)
  const effectiveOverviewError =
    hasOverviewError || (totalRowCount > 0 && summaryError)

  const filterOptions = useMemo(() => {
    const accountsSeen = new Set<string>()
    const categoriesSeen = new Set<string>()
    const sendersSeen = new Set<string>()
    const accounts: {
      value: string
      label: string
    }[] = []
    const categories: {
      value: string
      label: string
    }[] = []
    const senders: {
      value: string
      label: string
    }[] = []

    for (const row of overviewRows) {
      if (!accountsSeen.has(row.accountId)) {
        accountsSeen.add(row.accountId)
        accounts.push({
          value: row.accountId,
          label: row.accountName
        })
      }
      const catKey = row.categoryId ?? '__uncategorized__'
      if (!categoriesSeen.has(catKey)) {
        categoriesSeen.add(catKey)
        categories.push({
          value: catKey,
          label: row.categoryName
        })
      }
      if (!sendersSeen.has(row.senderId)) {
        sendersSeen.add(row.senderId)
        senders.push({
          value: row.senderId,
          label: row.senderName
        })
      }
    }

    return {
      statuses: Object.values(IncomeInstanceStatus).map((s) => ({
        value: s,
        label: t(`income.status.${s}`)
      })),
      accounts,
      categories,
      senders
    }
  }, [
    overviewRows,
    t
  ])

  const openCreateIncomeDrawer = useCallback(() => {
    openDrawer('createIncome', {})
  }, [
    openDrawer
  ])

  const filterDisabled =
    totalRowCount === 0 || effectiveOverviewLoading || effectiveOverviewError
  const overviewAmountBounds = useMemo(
    () => getAmountBounds(overviewRows),
    [
      overviewRows
    ]
  )

  const emptyMessage = useMemo((): ReactNode | undefined => {
    if (effectiveOverviewLoading) return t('common.loading')
    if (effectiveOverviewError) return t('common.error')
    if (totalRowCount === 0) return undefined
    if (filteredRowCount === 0) return t('common.noResultsFound')
    return undefined
  }, [
    effectiveOverviewError,
    effectiveOverviewLoading,
    filteredRowCount,
    totalRowCount,
    t
  ])

  const sourceDataRows = useMemo(() => {
    if (incomes.length === 0) return EMPTY_SOURCE_DATA_ROWS

    return incomes.map(
      (income) =>
        ({
          id: income.id,
          name: income.name,
          recurrenceType: income.recurrenceType,
          customIntervalDays: income.customIntervalDays ?? null,
          expectedDate: income.expectedDate,
          endDate: income.endDate,
          amount: income.estimatedAmount,
          accountId: income.accountId,
          accountName:
            accountById.get(income.accountId) ?? t('common.uncategorized'),
          categoryId: income.categoryId,
          categoryName:
            categoryById.get(income.categoryId) ?? t('common.uncategorized'),
          senderId: income.incomeSourceId,
          senderName: incomeSourceById.get(income.incomeSourceId) ?? '',
          numberOfRevisions: income.numberOfRevisions
        }) satisfies IncomeSourceDataRow
    )
  }, [
    incomes,
    accountById,
    categoryById,
    incomeSourceById,
    t
  ])

  const sourceDataLabelLookupRef = useRef<IncomeSourceLabelLookup>({
    accounts: new Map(),
    categories: new Map(),
    senders: new Map()
  })
  sourceDataLabelLookupRef.current = {
    accounts: accountById,
    categories: categoryById,
    senders: incomeSourceById
  }

  const sourceDataColumns = useMemo(
    () =>
      createIncomeSourceDataColumns({
        t,
        labelLookupRef: sourceDataLabelLookupRef,
        onViewRevisions: (incomeId) =>
          openDrawer('incomeRevisions', {
            incomeId,
            name: incomes.find((i) => i.id === incomeId)?.name ?? ''
          }),
        onEditUpcoming: (incomeId) =>
          openDrawer('editIncomeBlueprintUpcoming', {
            incomeId,
            mode: 'upcoming'
          }),
        onEditAll: (incomeId) =>
          openDrawer('editIncomeBlueprintAll', {
            incomeId,
            mode: 'all'
          }),
        onDeleteIncome: handleDeleteSourceIncome
      }),
    [
      t,
      openDrawer,
      handleDeleteSourceIncome,
      incomes
    ]
  )

  const {
    table: sourceDataTable,
    globalFilter: sourceDataGlobalFilter,
    setGlobalFilter: setSourceDataGlobalFilter,
    columnFilters: sourceDataColumnFilters,
    setColumnFilters: setSourceDataColumnFilters,
    activeFilters: sourceDataActiveFilters
  } = useDataTable({
    data: sourceDataRows,
    columns: sourceDataColumns,
    initialSorting: [
      {
        id: 'name',
        desc: false
      }
    ]
  })

  const sourceDataFilteredCount = sourceDataTable.getRowModel().rows.length
  const sourceDataAmountBounds = useMemo(
    () => getAmountBounds(sourceDataRows),
    [
      sourceDataRows
    ]
  )

  const sourceDataFilterOptions = useMemo(() => {
    const accountsSeen = new Set<string>()
    const categoriesSeen = new Set<string>()
    const sendersSeen = new Set<string>()
    const recurrencesSeen = new Set<RecurrenceType>()
    const accountOpts: {
      value: string
      label: string
    }[] = []
    const categoryOpts: {
      value: string
      label: string
    }[] = []
    const senderOpts: {
      value: string
      label: string
    }[] = []

    for (const row of sourceDataRows) {
      if (!accountsSeen.has(row.accountId)) {
        accountsSeen.add(row.accountId)
        accountOpts.push({
          value: row.accountId,
          label: row.accountName
        })
      }
      if (!categoriesSeen.has(row.categoryId)) {
        categoriesSeen.add(row.categoryId)
        categoryOpts.push({
          value: row.categoryId,
          label: row.categoryName
        })
      }
      if (!sendersSeen.has(row.senderId)) {
        sendersSeen.add(row.senderId)
        senderOpts.push({
          value: row.senderId,
          label: row.senderName
        })
      }
      recurrencesSeen.add(row.recurrenceType)
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
      [RecurrenceType.NONE]: t('income.sourceData.recurrence.none'),
      [RecurrenceType.WEEKLY]: t('income.sourceData.recurrence.weekly'),
      [RecurrenceType.MONTHLY]: t('income.sourceData.recurrence.monthly'),
      [RecurrenceType.QUARTERLY]: t('income.sourceData.recurrence.quarterly'),
      [RecurrenceType.YEARLY]: t('income.sourceData.recurrence.yearly'),
      [RecurrenceType.CUSTOM]: t('income.sourceData.recurrence.custom', {
        days: '?'
      })
    }

    return {
      recurrences: recurrenceOrder
        .filter((r) => recurrencesSeen.has(r))
        .map((r) => ({
          value: r,
          label: recurrenceLabels[r]
        })),
      accounts: accountOpts,
      categories: categoryOpts,
      senders: senderOpts
    }
  }, [
    sourceDataRows,
    t
  ])

  const showNoData = !!householdId && incomes.length === 0
  const loadingHeader =
    incomesLoading ||
    (incomes.length > 0 && effectiveOverviewLoading && !effectiveOverviewError)
  const loadingContent =
    incomesLoading || (tab === 'overview' && !showNoData && isOverviewLoading)

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
            label: t('income.status.UPCOMING'),
            value: overviewSummary?.upcomingCount ?? 0
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
            label: t('income.status.OVERDUE'),
            value: overviewSummary?.overdueCount ?? 0
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
            label: t('income.status.HANDLED'),
            value: overviewSummary?.handledCount ?? 0
          },
          {
            id: 'received',
            color: 'green',
            icon: (
              <CheckCircle2Icon
                className="stroke-[1.5]"
                aria-hidden
              />
            ),
            label: t('income.status.RECEIVED'),
            value: overviewSummary?.receivedCount ?? 0
          }
        ]

  return (
    <PageLayout
      title={t('income.title')}
      description={t('income.pageSubtitle')}
      loadingHeader={loadingHeader}
      loadingContent={loadingContent}
      infoCards={infoCards}
      tabs={
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as IncomeTab)}
        >
          <TabsList>
            <TabsTrigger
              value="overview"
              icon={<Eye className="size-4 stroke-[1.5]" />}
            >
              {t('income.tabs.overview')}
            </TabsTrigger>
            <TabsTrigger
              value="sourceData"
              icon={<FileText className="size-4 stroke-[1.5]" />}
            >
              {t('income.tabs.sourceData')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      }
    >
      {tab === 'overview' ? (
        <div className="flex min-h-0 flex-1 flex-col">
          {showNoData ? (
            <NoData
              variant="no-income"
              onAction={openCreateIncomeDrawer}
            />
          ) : (
            <DataTable
              table={table}
              columns={columns}
              globalFilter={globalFilter}
              onGlobalFilterChange={setGlobalFilter}
              filterDisabled={filterDisabled}
              onFilterClick={() =>
                openDrawer('incomeTableFilterDrawer', {
                  columnFilters,
                  onApply: setColumnFilters,
                  availableStatuses: filterOptions.statuses,
                  availableAccounts: filterOptions.accounts,
                  availableCategories: filterOptions.categories,
                  availableSenders: filterOptions.senders,
                  amountBounds: overviewAmountBounds
                })
              }
              activeFilters={activeFilters}
              actionButton={{
                label: t('income.createCTA'),
                icon: <PlusIcon />,
                onClick: openCreateIncomeDrawer,
                disabled: !householdId
              }}
              toolbarLabels={{
                searchPlaceholder: t('common.search'),
                filter: t('common.filter'),
                pillRemoveAriaLabel: t('common.removeFilter')
              }}
              emptyMessage={emptyMessage}
            />
          )}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          {showNoData ? (
            <NoData
              variant="no-income"
              onAction={openCreateIncomeDrawer}
            />
          ) : (
            <DataTable
              table={sourceDataTable}
              columns={sourceDataColumns}
              globalFilter={sourceDataGlobalFilter}
              onGlobalFilterChange={setSourceDataGlobalFilter}
              filterDisabled={sourceDataRows.length === 0}
              onFilterClick={() =>
                openDrawer('incomeSourceFilterDrawer', {
                  columnFilters: sourceDataColumnFilters,
                  onApply: setSourceDataColumnFilters,
                  availableRecurrences: sourceDataFilterOptions.recurrences,
                  availableAccounts: sourceDataFilterOptions.accounts,
                  availableCategories: sourceDataFilterOptions.categories,
                  availableSenders: sourceDataFilterOptions.senders,
                  amountBounds: sourceDataAmountBounds
                })
              }
              activeFilters={sourceDataActiveFilters}
              actionButton={{
                label: t('income.createCTA'),
                icon: <PlusIcon />,
                onClick: openCreateIncomeDrawer,
                disabled: !householdId
              }}
              toolbarLabels={{
                searchPlaceholder: t('common.search'),
                filter: t('common.filter'),
                pillRemoveAriaLabel: t('common.removeFilter')
              }}
              emptyMessage={
                sourceDataFilteredCount === 0 && sourceDataRows.length > 0
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
