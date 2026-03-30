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

import {
  type BillPaymentHandling,
  InstanceStatus
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
  useBillsList,
  useBudgetsList
} from '@/hooks/api'
import { formatCurrency } from '@/lib/utils'

import {
  type BillBasisRow,
  createBillBasisColumns
} from './-components/bill-basis-table'
import {
  type BillOverviewRow,
  type BillOverviewStatus,
  createBillOverviewColumns,
  type LabelLookup
} from './-components/bill-overview-table'

export const Route = createFileRoute('/_authenticated/bills/')({
  component: BillsPage
})

type BillTab = 'overview' | 'basis'

const EMPTY_OVERVIEW_ROWS: BillOverviewRow[] = []
const EMPTY_BASIS_ROWS: BillBasisRow[] = []

function BillsPage() {
  const { userId, householdId } = useAuth()
  const { t } = useTranslation()

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

  if (billsLoading) {
    return (
      <PageLayout
        title={t('bills.title')}
        description={t('bills.pageSubtitle')}
      >
        <div className="flex flex-1 items-center justify-center py-8">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </PageLayout>
    )
  }

  return (
    <BillsPageContent
      householdId={householdId}
      bills={bills}
      accounts={accounts}
      budgets={budgets}
    />
  )
}

interface BillsPageContentProps {
  householdId: string | null | undefined
  bills: ReturnType<typeof useBillsList>['data'] & {}
  accounts: ReturnType<typeof useAccountsList>['data'] & {}
  budgets: ReturnType<typeof useBudgetsList>['data'] & {}
}

function BillsPageContent({
  householdId,
  bills,
  accounts,
  budgets
}: BillsPageContentProps) {
  const { t } = useTranslation()
  const { openDrawer } = useDrawer()
  const [tab, setTab] = useState<BillTab>('overview')

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
    enabled: !!householdId && bills.length > 0
  })

  const isOverviewLoading = bills.length > 0 && instancesLoading
  const hasOverviewError = bills.length > 0 && instancesError

  const overviewRows = useMemo(() => {
    if (rawInstances.length === 0) return EMPTY_OVERVIEW_ROWS

    const today = startOfDay(new Date())

    return rawInstances.map((inst) => {
      const dueDate = inst.dueDate
      const hasTransaction = !!inst.transaction?.id
      const datePassed = dueDate <= today

      let status: BillOverviewStatus
      if (inst.status === InstanceStatus.HANDLED) {
        status = 'handled'
      } else if (datePassed && !hasTransaction) {
        status = 'overdue'
      } else if (inst.status === InstanceStatus.DUE) {
        status = 'pending'
      } else {
        status = 'upcoming'
      }

      return {
        id: inst.id,
        billId: inst.bill?.id ?? null,
        dueDate,
        billName: inst.name,
        status,
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
        recipientId: inst.recipient.id,
        recipientName: inst.recipient.name ?? ''
      } satisfies BillOverviewRow
    })
  }, [
    rawInstances,
    accountById,
    budgetById,
    t
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
    categories: new Map(
      overviewRows.map((r) => [
        r.categoryId ?? '__none__',
        r.categoryName
      ])
    ),
    recipients: recipientMap
  }

  const overviewColumns = useMemo(
    () =>
      createBillOverviewColumns({
        t,
        labelLookupRef,
        onEditBillInstance: () => void 0,
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
              recipientId: row.recipientId
            }
          }),
        onViewTransaction: () => void 0,
        onViewBasis: () => void 0,
        onDeleteBill: () => void 0
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
    columnFilters: _overviewColumnFilters,
    setColumnFilters: _setOverviewColumnFilters,
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

  const overviewFilteredRowCount = overviewTable.getRowModel().rows.length
  const overviewTotalRowCount = overviewRows.length

  const statusCounts = useMemo(() => {
    const counts: Record<BillOverviewStatus, number> = {
      upcoming: 0,
      overdue: 0,
      pending: 0,
      handled: 0
    }
    const sums: Record<BillOverviewStatus, number> = {
      upcoming: 0,
      overdue: 0,
      pending: 0,
      handled: 0
    }
    for (const row of overviewRows) {
      counts[row.status]++
      sums[row.status] += row.amount
    }
    return {
      counts,
      sums
    }
  }, [
    overviewRows
  ])

  const overviewFilterDisabled =
    overviewTotalRowCount === 0 || isOverviewLoading || hasOverviewError

  const overviewEmptyMessage = useMemo((): ReactNode | undefined => {
    if (isOverviewLoading) return t('common.loading')
    if (hasOverviewError) return t('common.error')
    if (overviewTotalRowCount === 0) return undefined
    if (overviewFilteredRowCount === 0) return t('common.noResultsFound')
    return undefined
  }, [
    overviewFilteredRowCount,
    hasOverviewError,
    isOverviewLoading,
    overviewTotalRowCount,
    t
  ])

  const basisRows = useMemo(() => {
    if (bills.length === 0) return EMPTY_BASIS_ROWS

    return bills.map(
      (bill) =>
        ({
          id: bill.id,
          name: bill.name,
          recurrenceType: bill.recurrenceType,
          customIntervalDays: bill.customIntervalDays ?? null,
          startDate: bill.startDate,
          endDate: bill.endDate,
          amount: bill.estimatedAmount,
          paymentHandling: bill.paymentHandling as
            | BillPaymentHandling
            | null
            | undefined,
          accountId: bill.account?.id ?? null,
          accountName:
            accountById.get(bill.account?.id ?? '') ??
            t('common.uncategorized'),
          budgetId: bill.budget?.id ?? null,
          budgetName:
            budgetById.get(bill.budget?.id ?? '') ?? t('common.uncategorized'),
          categoryId: bill.category?.id ?? null,
          categoryName: bill.category?.name ?? t('common.uncategorized'),
          recipientId: bill.recipient.id,
          recipientName: bill.recipient.name ?? '',
          hasRevisions: false
        }) satisfies BillBasisRow
    )
  }, [
    bills,
    accountById,
    budgetById,
    t
  ])

  const basisColumns = useMemo(
    () =>
      createBillBasisColumns({
        t,
        onViewRevisions: () => void 0,
        onEditUpcoming: () => void 0,
        onEditAll: () => void 0,
        onDeleteBill: () => void 0
      }),
    [
      t
    ]
  )

  const {
    table: basisTable,
    globalFilter: basisGlobalFilter,
    setGlobalFilter: setBasisGlobalFilter,
    columnFilters: _basisColumnFilters,
    setColumnFilters: _setBasisColumnFilters,
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

  const openCreateBillDrawer = useCallback(() => {
    openDrawer('createBill', {})
  }, [
    openDrawer
  ])

  const showNoData = !!householdId && bills.length === 0

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
            label: t('bills.summary.upcoming'),
            value: formatCurrency(statusCounts.sums.upcoming)
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
            value: formatCurrency(statusCounts.sums.overdue)
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
            label: t('bills.summary.pending'),
            value: formatCurrency(statusCounts.sums.pending)
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
            label: t('bills.summary.handled'),
            value: formatCurrency(statusCounts.sums.handled)
          }
        ]

  return (
    <PageLayout
      title={t('bills.title')}
      description={t('bills.pageSubtitle')}
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
              onFilterClick={() => void 0}
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
              onFilterClick={() => void 0}
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
