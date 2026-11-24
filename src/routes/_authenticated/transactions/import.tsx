import {
  createFileRoute,
  getRouteApi,
  useNavigate
} from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { TransactionType } from '@/api/generated/types.gen'
import { PageLayout } from '@/components/page-layout/page-layout'
import { useAuth } from '@/contexts/auth-context'
import { sumExpenseLinesByBudget } from '@/drawers/drawers/create-transaction-drawer/budget-allocation-shortfall'
import {
  findBudgetCoverDonors,
  resolveBudgetCover
} from '@/drawers/drawers/create-transaction-drawer/budget-cover-plan'
import { describeAutoAllocations } from '@/drawers/drawers/create-transaction-drawer/submit-expense-with-allocation'
import { findLatestAccountTransaction } from '@/features/import-statements/already-imported'
import { buildBulkCreateRequest } from '@/features/import-statements/build-bulk-create-request'
import type { HistoryTransaction } from '@/features/import-statements/classification/history-matching'
import {
  buildBillInstancePatch,
  buildIncomeInstancePatch,
  findMatchingBillInstanceId,
  findMatchingIncomeInstanceId
} from '@/features/import-statements/classification/instance-matching'
import { ExpensesTable } from '@/features/import-statements/components/expenses-table'
import {
  Footer,
  importValidationMessages
} from '@/features/import-statements/components/footer'
import { IncomesTable } from '@/features/import-statements/components/incomes-table'
import {
  StatementFileInput,
  type StatementFileInputHandle
} from '@/features/import-statements/components/statement-file-input'
import { Summary } from '@/features/import-statements/components/summary'
import { TransfersTable } from '@/features/import-statements/components/transfers-table'
import { UncategorizedTable } from '@/features/import-statements/components/uncategorized-table'
import {
  computeImportAvailableToAllocate,
  computeImportBudgetShortfalls,
  expenseLinesFromImportDrafts
} from '@/features/import-statements/import-budget-shortfalls'
import {
  buildDraftsFromStatements,
  changeOriginAccountInPlace,
  importHistoryStartDate,
  toLookupItems
} from '@/features/import-statements/import-drafts'
import {
  clearActiveStatements,
  getActiveStatements,
  setActiveStatements
} from '@/features/import-statements/session'
import { submitImportInOrder } from '@/features/import-statements/submit-import'
import type {
  ImportStatement,
  InvalidStatementRow,
  TransactionDraft
} from '@/features/import-statements/types'
import {
  useAccountsList,
  useAllocationsQuery,
  useBillInstancesList,
  useBudgetsList,
  useBulkCreateTransactions,
  useCategoriesList,
  useCreateAllocationMutation,
  useIncomeInstancesFilteredList,
  useIncomeSourcesList,
  useRecipientsList,
  useTransactionsList,
  useTransferAllocationMutation
} from '@/hooks/api'
import { useBudgetCoverDialog } from '@/hooks/use-budget-cover-dialog'
import { getErrorMessage } from '@/lib/api-error'

export const Route = createFileRoute('/_authenticated/transactions/import')({
  component: ImportTransactionsPage
})

const authenticatedRouteApi = getRouteApi('/_authenticated')

/** Stable empty list while earlier transactions are loading. */
const NO_HISTORY: HistoryTransaction[] = []

function ImportTransactionsPage() {
  const { householdId, userId } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { from, to } = authenticatedRouteApi.useSearch()
  const fileInputRef = useRef<StatementFileInputHandle | null>(null)
  const [statements, setStatements] = useState<ImportStatement[]>(() =>
    getActiveStatements()
  )
  const [appliedStatements, setAppliedStatements] = useState<
    ImportStatement[] | null
  >(null)
  const [autoMatchedSignature, setAutoMatchedSignature] = useState('')
  const [drafts, setDrafts] = useState<TransactionDraft[]>([])
  const [originAccountIds, setOriginAccountIds] = useState<string[]>([])
  // Once rows are edited by hand, changing an account must not rebuild them.
  const hasManualEditsRef = useRef(false)
  const [importFailures, setImportFailures] = useState<Record<string, string>>(
    {}
  )
  const [isImporting, setIsImporting] = useState(false)

  const { mutateAsync: bulkCreateAsync, isPending: bulkCreatePending } =
    useBulkCreateTransactions()
  const { mutateAsync: createAllocationAsync } = useCreateAllocationMutation()
  const { mutateAsync: transferAllocationAsync } =
    useTransferAllocationMutation()
  const { promptBudgetPulls, budgetCoverDialog } = useBudgetCoverDialog()

  const { data: accountsData = [], isLoading: accountsLoading } =
    useAccountsList({
      householdId,
      userId,
      enabled: !!householdId,
      excludeArchived: false
    })
  const { data: allocationSummary } = useAllocationsQuery({
    householdId,
    userId,
    enabled: !!householdId
  })
  const { data: budgetsData = [], isLoading: budgetsLoading } = useBudgetsList({
    householdId,
    userId,
    enabled: !!householdId
  })
  const { data: categoriesData = [], isLoading: categoriesLoading } =
    useCategoriesList({
      householdId,
      userId,
      enabled: !!householdId
    })
  const { data: recipientsData = [], isLoading: recipientsLoading } =
    useRecipientsList({
      householdId,
      userId,
      enabled: !!householdId
    })
  const { data: incomeSourcesData = [], isLoading: incomeSourcesLoading } =
    useIncomeSourcesList({
      householdId,
      userId,
      includeArchived: false,
      enabled: !!householdId
    })

  const accounts = useMemo(
    () => toLookupItems(accountsData),
    [
      accountsData
    ]
  )
  const budgets = useMemo(
    () => toLookupItems(budgetsData),
    [
      budgetsData
    ]
  )
  const categories = useMemo(
    () => toLookupItems(categoriesData),
    [
      categoriesData
    ]
  )
  const recipients = useMemo(
    () => toLookupItems(recipientsData),
    [
      recipientsData
    ]
  )
  const incomeSources = useMemo(
    () => toLookupItems(incomeSourcesData),
    [
      incomeSourcesData
    ]
  )

  const hasIncomeRows = drafts.some(
    (draft) => draft.type === TransactionType.INCOME
  )
  const hasExpenseRows = drafts.some(
    (draft) => draft.type === TransactionType.EXPENSE
  )

  const { data: incomeInstances = [], isLoading: incomeInstancesLoading } =
    useIncomeInstancesFilteredList({
      householdId,
      includeArchived: false,
      enabled: !!householdId && hasIncomeRows
    })
  const { data: billInstances = [], isLoading: billInstancesLoading } =
    useBillInstancesList({
      householdId,
      includeArchived: false,
      enabled: !!householdId && hasExpenseRows
    })

  // Earlier transactions teach the import which recipient, category, budget,
  // and transfer account a bank text had last time, and which rows of the
  // statement are already saved.
  const historyFrom = useMemo(
    () => importHistoryStartDate(statements),
    [
      statements
    ]
  )
  const {
    data: historyData = NO_HISTORY,
    isLoading: historyLoading,
    isError: historyFailed
  } = useTransactionsList({
    householdId,
    userId,
    dateFrom: historyFrom,
    enabled: !!householdId && !!historyFrom
  })

  // Without saved transactions nothing is recognized as already imported, so
  // the user must know before importing an overlapping period.
  useEffect(() => {
    if (historyFailed) {
      toast.error(t('statementImport.errors.historyUnavailable'))
    }
  }, [
    historyFailed,
    t
  ])

  const lookupsLoading =
    accountsLoading ||
    budgetsLoading ||
    categoriesLoading ||
    recipientsLoading ||
    incomeSourcesLoading ||
    historyLoading

  useEffect(() => {
    if (
      !appliedStatements ||
      autoMatchedSignature ===
        `${incomeInstances.length}:${billInstances.length}` ||
      incomeInstancesLoading ||
      billInstancesLoading
    ) {
      return
    }

    setDrafts((current) => {
      const selectedIncomeIds = new Set<string>()
      const selectedBillIds = new Set<string>()

      return current.map((draft) => {
        // Rows the import excluded itself should not take an instance away
        // from a row that will actually be imported.
        if (draft.duplicateOfTransactionId || draft.pairedWithDraftId) {
          return draft
        }

        if (draft.type === TransactionType.INCOME) {
          if (draft.incomeInstanceId) {
            selectedIncomeIds.add(draft.incomeInstanceId)
            return draft
          }
          const incomeInstanceId = findMatchingIncomeInstanceId(
            draft,
            incomeInstances,
            selectedIncomeIds
          )
          if (!incomeInstanceId) return draft
          const instance = incomeInstances.find(
            (item) => item.id === incomeInstanceId
          )
          selectedIncomeIds.add(incomeInstanceId)
          return {
            ...draft,
            ...(instance
              ? buildIncomeInstancePatch(instance)
              : {
                  incomeInstanceId
                })
          }
        }

        if (draft.type === TransactionType.EXPENSE) {
          if (draft.billInstanceId) {
            selectedBillIds.add(draft.billInstanceId)
            return draft
          }
          const billInstanceId = findMatchingBillInstanceId(
            draft,
            billInstances,
            selectedBillIds
          )
          if (!billInstanceId) return draft
          const instance = billInstances.find(
            (item) => item.id === billInstanceId
          )
          selectedBillIds.add(billInstanceId)
          return {
            ...draft,
            ...(instance
              ? buildBillInstancePatch(instance)
              : {
                  billInstanceId
                })
          }
        }

        return draft
      })
    })
    setAutoMatchedSignature(`${incomeInstances.length}:${billInstances.length}`)
  }, [
    appliedStatements,
    autoMatchedSignature,
    billInstances,
    billInstancesLoading,
    incomeInstances,
    incomeInstancesLoading
  ])

  useEffect(() => {
    if (
      statements.length === 0 ||
      appliedStatements === statements ||
      lookupsLoading
    ) {
      return
    }

    const next = buildDraftsFromStatements(statements, {
      accounts,
      recipients,
      incomeSources,
      categories,
      budgets,
      history: historyData
    })
    setOriginAccountIds(next.originAccountIds)
    setDrafts(next.drafts)
    setAppliedStatements(statements)
    hasManualEditsRef.current = false
  }, [
    accounts,
    appliedStatements,
    budgets,
    categories,
    historyData,
    incomeSources,
    lookupsLoading,
    recipients,
    statements
  ])

  const summaryStatements = useMemo(
    () =>
      statements.map((statement, statementIndex) => {
        const originAccountId = originAccountIds[statementIndex] ?? ''
        return {
          fileName: statement.fileName,
          originAccountId,
          latestTransaction: findLatestAccountTransaction(
            historyData,
            originAccountId
          )
        }
      }),
    [
      historyData,
      originAccountIds,
      statements
    ]
  )

  const invalidRows = useMemo<InvalidStatementRow[]>(
    () =>
      statements.flatMap((statement) =>
        statement.result.invalidRows.map((row) =>
          statements.length > 1
            ? {
                ...row,
                fileName: statement.fileName
              }
            : row
        )
      ),
    [
      statements
    ]
  )

  const validationMessages = useMemo(() => {
    const messages = importValidationMessages(drafts, t)
    for (const [draftId, message] of Object.entries(importFailures)) {
      const draft = drafts.find((row) => row.id === draftId)
      messages.push(
        t('statementImport.import.rowFailed', {
          row: draft?.sourceRowNumber ?? draftId,
          message
        })
      )
    }
    return messages
  }, [
    drafts,
    importFailures,
    t
  ])

  const handleParsed = (nextStatements: ImportStatement[]) => {
    setActiveStatements(nextStatements)
    setStatements(nextStatements)
    setAppliedStatements(null)
    setAutoMatchedSignature('')
    setImportFailures({})
  }

  const handleOriginAccountChange = (
    statementIndex: number,
    accountId: string
  ) => {
    const nextOriginAccountIds = statements.map((_, index) =>
      index === statementIndex ? accountId : (originAccountIds[index] ?? '')
    )
    setOriginAccountIds(nextOriginAccountIds)

    if (hasManualEditsRef.current) {
      // Keep the user's edits: only move the account fields.
      setDrafts((current) =>
        changeOriginAccountInPlace(current, statementIndex, accountId)
      )
      return
    }

    // Nothing edited yet, so redo the whole analysis for the new account:
    // already-saved rows, transfer accounts, and pairing all depend on it.
    const next = buildDraftsFromStatements(
      statements,
      {
        accounts,
        recipients,
        incomeSources,
        categories,
        budgets,
        history: historyData
      },
      nextOriginAccountIds
    )
    setDrafts(next.drafts)
    setAutoMatchedSignature('')
  }

  const handleDraftChange = useCallback(
    (id: string, patch: Partial<TransactionDraft>) => {
      hasManualEditsRef.current = true
      setImportFailures((current) => {
        if (!(id in current)) return current
        const next = {
          ...current
        }
        delete next[id]
        return next
      })
      setDrafts((current) =>
        current.map((draft) =>
          draft.id === id
            ? {
                ...draft,
                ...patch
              }
            : draft
        )
      )
    },
    []
  )

  const applyBulkFailures = (
    failed: Array<{
      clientRowId: string
      message: string
    }>,
    created: Array<{
      clientRowId: string
    }>
  ) => {
    const createdIds = new Set(created.map((row) => row.clientRowId))
    setDrafts((current) => current.filter((draft) => !createdIds.has(draft.id)))
    setImportFailures(
      Object.fromEntries(
        failed.map((row) => [
          row.clientRowId,
          row.message
        ])
      )
    )
  }

  const handleImport = async () => {
    const hasRows = buildBulkCreateRequest(drafts).transactions.length > 0
    if (!hasRows || isImporting) return

    const shortfalls = computeImportBudgetShortfalls({
      drafts,
      budgets: budgetsData
    })
    // Budgets short of money are topped up from the unallocated pool (which
    // will include the incomes in this import) without asking; the dialog only
    // opens when the pool is not enough.
    const cover = await resolveBudgetCover({
      shortfalls,
      poolAvailable: computeImportAvailableToAllocate({
        unallocatedAmount: allocationSummary?.unallocated ?? 0,
        drafts
      }),
      donors: findBudgetCoverDonors({
        budgets: budgetsData,
        shortfalls,
        demandByBudgetId: sumExpenseLinesByBudget(
          expenseLinesFromImportDrafts(drafts)
        )
      }),
      confirmLabel: t('statementImport.allocation.submit'),
      promptPulls: promptBudgetPulls
    })
    if (!cover) return

    setIsImporting(true)
    try {
      const result = await submitImportInOrder({
        drafts,
        budgetCoverPlan: cover.plan,
        userId,
        bulkCreateAsync,
        createAllocationAsync,
        transferAllocationAsync
      })

      if (!result.ok) {
        if (result.phase === 'incomes' && result.incomeResult) {
          applyBulkFailures(
            result.incomeResult.failed,
            result.incomeResult.created
          )
          toast.error(t('statementImport.import.incomePhaseFailed'))
          return
        }

        if (result.phase === 'allocations') {
          if (result.incomeResult?.created.length) {
            applyBulkFailures([], result.incomeResult.created)
          }
          toast.error(
            getErrorMessage(result.allocationError) ||
              t('statementImport.import.allocationPhaseFailed')
          )
          return
        }

        if (result.finalResult) {
          applyBulkFailures(result.finalResult.failed, [
            ...(result.incomeResult?.created ?? []),
            ...result.finalResult.created
          ])
          toast.error(t('statementImport.import.transfersExpensesPhaseFailed'))
        }
        return
      }

      clearActiveStatements()
      const createdCount =
        (result.incomeResult?.created.length ?? 0) +
        (result.finalResult?.created.length ?? 0)
      toast.success(
        t('statementImport.import.success', {
          count: createdCount
        })
      )
      if (!cover.asked && cover.plan.allocations.length > 0) {
        toast.info(
          t('transactions.autoAllocated', {
            details: describeAutoAllocations(cover.plan, shortfalls)
          })
        )
      }
      navigate({
        to: '/transactions',
        search: {
          from,
          to
        }
      })
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsImporting(false)
    }
  }

  const commonTableProps = useMemo(
    () => ({
      accounts,
      budgets,
      categories,
      recipients,
      incomeSources,
      incomeInstances,
      billInstances,
      showOriginAccount: statements.length > 1,
      onDraftChange: handleDraftChange
    }),
    [
      accounts,
      billInstances,
      budgets,
      categories,
      handleDraftChange,
      incomeInstances,
      incomeSources,
      recipients,
      statements.length
    ]
  )

  return (
    <PageLayout
      title={t('statementImport.page.title')}
      description={t('statementImport.page.description')}
      loadingContent={lookupsLoading}
    >
      <StatementFileInput
        inputRef={fileInputRef}
        onParsed={handleParsed}
      />
      {budgetCoverDialog}
      <div className="flex flex-col gap-6">
        <Summary
          drafts={drafts}
          statements={summaryStatements}
          accounts={accounts}
          onOriginAccountChange={handleOriginAccountChange}
          onChangeFile={() => fileInputRef.current?.open()}
        />
        {drafts.some((draft) => draft.type === 'uncategorized') ? (
          <UncategorizedTable
            title={t('statementImport.sections.uncategorized')}
            rows={drafts.filter((draft) => draft.type === 'uncategorized')}
            {...commonTableProps}
          />
        ) : null}
        <IncomesTable
          title={t('statementImport.sections.incomes')}
          rows={drafts.filter((draft) => draft.type === TransactionType.INCOME)}
          {...commonTableProps}
        />
        <TransfersTable
          title={t('statementImport.sections.transfers')}
          rows={drafts.filter(
            (draft) => draft.type === TransactionType.TRANSFER
          )}
          {...commonTableProps}
        />
        <ExpensesTable
          title={t('statementImport.sections.expenses')}
          rows={drafts.filter(
            (draft) => draft.type === TransactionType.EXPENSE
          )}
          {...commonTableProps}
        />
        <Footer
          validationMessages={validationMessages}
          invalidRows={invalidRows}
          isSubmitting={isImporting || bulkCreatePending}
          onImport={handleImport}
        />
      </div>
    </PageLayout>
  )
}
