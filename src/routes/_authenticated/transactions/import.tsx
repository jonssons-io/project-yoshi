import {
  createFileRoute,
  getRouteApi,
  useNavigate
} from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { TransactionType } from '@/api/generated/types.gen'
import { PageLayout } from '@/components/page-layout/page-layout'
import { useAuth } from '@/contexts/auth-context'
import { buildBulkCreateRequest } from '@/features/import-statements/build-bulk-create-request'
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
import {
  type ImportAllocationChoice,
  useImportBudgetAllocationDialog
} from '@/features/import-statements/components/import-allocation-dialog'
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
  pendingIncomeTotalFromImportDrafts
} from '@/features/import-statements/import-budget-shortfalls'
import {
  buildDraftsFromStatement,
  toLookupItems
} from '@/features/import-statements/import-drafts'
import {
  clearActiveStatement,
  getActiveStatement,
  getActiveStatementFileName,
  setActiveStatement
} from '@/features/import-statements/session'
import { submitImportInOrder } from '@/features/import-statements/submit-import'
import type {
  StatementParseResult,
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
  useRecipientsList
} from '@/hooks/api'
import { getErrorMessage } from '@/lib/api-error'

export const Route = createFileRoute('/_authenticated/transactions/import')({
  component: ImportTransactionsPage
})

const authenticatedRouteApi = getRouteApi('/_authenticated')

function ImportTransactionsPage() {
  const { householdId, userId } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { from, to } = authenticatedRouteApi.useSearch()
  const fileInputRef = useRef<StatementFileInputHandle | null>(null)
  const [parseResult, setParseResult] = useState<StatementParseResult | null>(
    () => getActiveStatement()
  )
  const [fileName, setFileName] = useState(() => getActiveStatementFileName())
  const [appliedResult, setAppliedResult] =
    useState<StatementParseResult | null>(null)
  const [autoMatchedSignature, setAutoMatchedSignature] = useState('')
  const [drafts, setDrafts] = useState<TransactionDraft[]>([])
  const [originAccountId, setOriginAccountId] = useState('')
  const [importFailures, setImportFailures] = useState<Record<string, string>>(
    {}
  )
  const [isImporting, setIsImporting] = useState(false)

  const { mutateAsync: bulkCreateAsync, isPending: bulkCreatePending } =
    useBulkCreateTransactions()
  const { mutateAsync: createAllocationAsync } = useCreateAllocationMutation()
  const { promptImportAllocations, importAllocationDialog } =
    useImportBudgetAllocationDialog()

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

  const lookupsLoading =
    accountsLoading ||
    budgetsLoading ||
    categoriesLoading ||
    recipientsLoading ||
    incomeSourcesLoading

  useEffect(() => {
    if (
      !appliedResult ||
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
    appliedResult,
    autoMatchedSignature,
    billInstances,
    billInstancesLoading,
    incomeInstances,
    incomeInstancesLoading
  ])

  useEffect(() => {
    if (!parseResult || appliedResult === parseResult || lookupsLoading) return

    const next = buildDraftsFromStatement(parseResult, {
      accounts,
      recipients,
      incomeSources,
      categories
    })
    setOriginAccountId(next.originAccountId)
    setDrafts(next.drafts)
    setAppliedResult(parseResult)
  }, [
    accounts,
    appliedResult,
    categories,
    incomeSources,
    lookupsLoading,
    parseResult,
    recipients
  ])

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

  const handleParsed = (result: StatementParseResult, nextFileName: string) => {
    setActiveStatement(result, nextFileName)
    setParseResult(result)
    setFileName(nextFileName)
    setAppliedResult(null)
    setAutoMatchedSignature('')
    setImportFailures({})
  }

  const handleOriginAccountChange = (accountId: string) => {
    setOriginAccountId(accountId)
    setDrafts((current) =>
      current.map((draft) => ({
        ...draft,
        originAccountId: accountId,
        transferFromAccountId:
          draft.type === TransactionType.TRANSFER && draft.amount < 0
            ? accountId
            : draft.transferFromAccountId,
        transferToAccountId:
          draft.type === TransactionType.TRANSFER && draft.amount > 0
            ? accountId
            : draft.transferToAccountId
      }))
    )
  }

  const handleDraftChange = (id: string, patch: Partial<TransactionDraft>) => {
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
  }

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
    const existingUnallocated = allocationSummary?.unallocated ?? 0
    const pendingIncomeAmount = pendingIncomeTotalFromImportDrafts(drafts)
    const availableToAllocate = computeImportAvailableToAllocate({
      unallocatedAmount: existingUnallocated,
      drafts
    })

    let allocationChoices: ImportAllocationChoice[] = []

    if (shortfalls.length > 0) {
      const choices = await promptImportAllocations({
        shortfalls,
        unallocatedAmount: availableToAllocate,
        existingUnallocated,
        pendingIncomeAmount
      })
      if (!choices) return
      allocationChoices = choices
    }

    setIsImporting(true)
    try {
      const result = await submitImportInOrder({
        drafts,
        allocationChoices,
        userId,
        bulkCreateAsync,
        createAllocationAsync
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

      clearActiveStatement()
      const createdCount =
        (result.incomeResult?.created.length ?? 0) +
        (result.finalResult?.created.length ?? 0)
      toast.success(
        t('statementImport.import.success', {
          count: createdCount
        })
      )
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

  const commonTableProps = {
    accounts,
    budgets,
    categories,
    recipients,
    incomeSources,
    incomeInstances,
    billInstances,
    onDraftChange: handleDraftChange
  }

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
      {importAllocationDialog}
      <div className="flex flex-col gap-6">
        <Summary
          drafts={drafts}
          fileName={fileName}
          accounts={accounts}
          originAccountId={originAccountId}
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
          invalidRows={parseResult?.invalidRows ?? []}
          isSubmitting={isImporting || bulkCreatePending}
          onImport={handleImport}
        />
      </div>
    </PageLayout>
  )
}
