import { useQueries } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { startOfDay } from 'date-fns'
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

import { listIncomeInstancesOptions } from '@/api/generated/@tanstack/react-query.gen'
import type { IncomeInstance } from '@/api/generated/types.gen'
import { DataTable, useDataTable } from '@/components/data-table'
import {
  PageLayout,
  type PageLayoutProps
} from '@/components/page-layout/page-layout'
import { Tabs, TabsList, TabsTrigger } from '@/components/tabs/tabs'
import { useAuth } from '@/contexts/auth-context'
import { useDrawer } from '@/drawers'
import { NoData } from '@/features/no-data/no-data'
import { useAccountsList, useCategoriesList, useIncomeList } from '@/hooks/api'
import { fromApiDate } from '@/hooks/api/date-normalization'

import {
  createIncomeOverviewColumns,
  deriveIncomeOverviewStatus,
  type IncomeOverviewRow,
  type IncomeOverviewStatus,
  type LabelLookup
} from './-components/income-overview-table'

export const Route = createFileRoute('/_authenticated/income/')({
  component: IncomePage
})

type IncomeTab = 'overview' | 'sourceData'

const EMPTY_ROWS: IncomeOverviewRow[] = []

function IncomePage() {
  const { userId, householdId } = useAuth()
  const { t } = useTranslation()

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
    type: 'INCOME',
    enabled: !!householdId
  })

  if (incomesLoading) {
    return (
      <PageLayout
        title={t('income.title')}
        description={t('income.pageSubtitle')}
      >
        <div className="flex flex-1 items-center justify-center py-8">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </PageLayout>
    )
  }

  return (
    <IncomePageContent
      householdId={householdId}
      incomes={incomes}
      accounts={accounts}
      categories={categories}
    />
  )
}

interface IncomePageContentProps {
  householdId: string | null | undefined
  incomes: ReturnType<typeof useIncomeList>['data'] & {}
  accounts: ReturnType<typeof useAccountsList>['data'] & {}
  categories: ReturnType<typeof useCategoriesList>['data'] & {}
}

/**
 * Renders the full income page once incomes have loaded.
 * Separated from IncomePage so the single useQuery for instances
 * only runs after incomes are available — keeping the data flow
 * sequential and avoiding stale-closure issues.
 */
function IncomePageContent({
  householdId,
  incomes,
  accounts,
  categories
}: IncomePageContentProps) {
  const { t } = useTranslation()
  const { openDrawer } = useDrawer()
  const [tab, setTab] = useState<IncomeTab>('overview')

  const accountById = useMemo(
    () =>
      new Map(
        accounts.map((a) => [
          a.id,
          a.name
        ])
      ),
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

  const queryOptions = useMemo(
    () =>
      incomes.map((income) =>
        listIncomeInstancesOptions({
          path: {
            incomeId: income.id
          }
        })
      ),
    [
      incomes
    ]
  )

  const {
    instances: rawInstances,
    isLoading: instancesLoading,
    isError: instancesError
  } = useQueries({
    queries: queryOptions,
    combine: (results) => ({
      instances: results.flatMap(
        (r) => (r.data?.data ?? []) as IncomeInstance[]
      ),
      isLoading: results.some((r) => r.isLoading),
      isError: results.some((r) => r.isError)
    })
  })

  const isOverviewLoading = incomes.length > 0 && instancesLoading
  const hasOverviewError = incomes.length > 0 && instancesError

  const overviewRows = useMemo(() => {
    if (rawInstances.length === 0) return EMPTY_ROWS

    const today = startOfDay(new Date())

    return rawInstances.map((inst) => {
      const expectedDate = fromApiDate(inst.expectedDate)
      const hasTransaction = !!inst.transactionId
      const datePassed = expectedDate <= today

      return {
        id: inst.id,
        expectedDate,
        incomeName: inst.name,
        status: deriveIncomeOverviewStatus(hasTransaction, datePassed),
        transactionConnected: hasTransaction,
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

  const filteredRowCount = table.getRowModel().rows.length
  const totalRowCount = overviewRows.length

  const statusCounts = useMemo(() => {
    const counts: Record<IncomeOverviewStatus, number> = {
      handled: 0,
      pending: 0,
      overdue: 0,
      upcoming: 0
    }
    for (const row of overviewRows) {
      counts[row.status]++
    }
    return counts
  }, [
    overviewRows
  ])

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
      statuses: (
        [
          'handled',
          'pending',
          'overdue',
          'upcoming'
        ] as IncomeOverviewStatus[]
      ).map((s) => ({
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
    totalRowCount === 0 || isOverviewLoading || hasOverviewError

  const emptyMessage = useMemo((): ReactNode | undefined => {
    if (isOverviewLoading) return t('common.loading')
    if (hasOverviewError) return t('common.error')
    if (totalRowCount === 0) return undefined
    if (filteredRowCount === 0) return t('common.noResultsFound')
    return undefined
  }, [
    filteredRowCount,
    hasOverviewError,
    isOverviewLoading,
    totalRowCount,
    t
  ])

  const showNoData = !!householdId && incomes.length === 0
  const infoCards: PageLayoutProps['infoCards'] =
    isOverviewLoading || hasOverviewError
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
            label: t('income.summary.upcoming'),
            value: statusCounts.upcoming
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
            label: t('income.summary.overdue'),
            value: statusCounts.overdue
          },
          {
            id: 'pending',
            color: 'blue',
            icon: (
              <ClockIcon
                className="stroke-[1.5]"
                aria-hidden
              />
            ),
            label: t('income.summary.pending'),
            value: statusCounts.pending
          },
          {
            id: 'handled',
            color: 'green',
            icon: (
              <CheckCircle2Icon
                className="stroke-[1.5]"
                aria-hidden
              />
            ),
            label: t('income.summary.handled'),
            value: statusCounts.handled
          }
        ]

  return (
    <PageLayout
      title={t('income.title')}
      description={t('income.pageSubtitle')}
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
                  availableSenders: filterOptions.senders
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
        <div className="flex flex-1 items-center justify-center py-12">
          <p className="type-body-medium text-gray-600">
            {`${t('income.tabs.sourceData')} — coming soon`}
          </p>
        </div>
      )}
    </PageLayout>
  )
}
