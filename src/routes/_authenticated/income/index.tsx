/**
 * Income Page - List and manage recurring income
 */

import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { format } from 'date-fns'
import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  ChevronDown,
  ChevronRight,
  MoreVerticalIcon,
  Pencil,
  Plus,
  ReceiptText,
  Trash2
} from 'lucide-react'
import {
  Fragment,
  type FormEvent,
  useEffect,
  useId,
  useMemo,
  useState
} from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  TransactionType,
  type Income,
  type IncomeInstance,
  type IncomeSource,
  InstanceStatus,
  RecurrenceType
} from '@/api/generated/types.gen'
import { BaseButton } from '@/components/base-button/base-button'
import { SetupPrompt } from '@/components/dashboard/SetupPrompt'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/button/button'
import { IconButton } from '@/components/icon-button/icon-button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { useAuth } from '@/contexts/auth-context'
import { IncomeForm } from '@/forms/IncomeForm'
import {
  useAccountsList,
  useArchiveIncome,
  useBudgetsList,
  useCategoriesList,
  useCreateIncome,
  useCreateTransaction,
  useDeleteIncome,
  useIncomeList,
  useRecipientsList,
  useUpdateIncome
} from '@/hooks/api'
import { invalidateByOperation } from '@/hooks/api/invalidate-by-operation'
import { useUpdateIncomeInstance } from '@/hooks/api/mutations/use-income-mutations'
import {
  useIncomeInstanceById,
  useIncomeInstancesList
} from '@/hooks/api/queries/use-income-query'
import { useConfirmDialog } from '@/hooks/use-confirm-dialog'
import { useDrawer } from '@/hooks/use-drawer'
import { getErrorMessage } from '@/lib/api-error'
import { formatCurrency } from '@/lib/utils'

type NormalizedIncome = Omit<Income, 'expectedDate' | 'endDate'> & {
  expectedDate: Date
  endDate?: Date | undefined
}

type NormalizedIncomeInstance = Omit<IncomeInstance, 'expectedDate'> & {
  expectedDate: Date
}

type SelectableCategory = {
  id: string
  name: string
  types: string[]
  archived?: boolean
}

type SelectableAccount = {
  id: string
  name: string
  archived?: boolean
}

type IncomeInstancesSectionProps = {
  income: NormalizedIncome
  expanded: boolean
  userId?: string | null
  accountsById: Map<string, SelectableAccount>
  categoriesById: Map<string, SelectableCategory>
  onEditInstance: (instanceId: string) => void
  onRecordInstance: (
    income: NormalizedIncome,
    instance: NormalizedIncomeInstance
  ) => void
}

type EditIncomeInstanceDrawerContentProps = {
  instanceId: string
  userId?: string | null
  accounts: SelectableAccount[]
  categories: SelectableCategory[]
  onClose: () => void
  onSuccess: () => void
}

const NO_CATEGORY_VALUE = '__none__'

export const Route = createFileRoute('/_authenticated/income/')({
  component: IncomePage
})

function getIncomeInstanceStatusClass(status: InstanceStatus): string {
  switch (status) {
    case InstanceStatus.HANDLED:
      return 'border-green-200 bg-green-50 text-green-700'
    case InstanceStatus.DUE:
      return 'border-amber-200 bg-amber-50 text-amber-700'
    default:
      return 'border-muted-foreground/20 bg-muted text-muted-foreground'
  }
}

function IncomeInstancesSection({
  income,
  expanded,
  userId,
  accountsById,
  categoriesById,
  onEditInstance,
  onRecordInstance
}: IncomeInstancesSectionProps) {
  const { t } = useTranslation()
  const instancesQuery = useIncomeInstancesList({
    incomeId: income.id,
    userId,
    enabled: expanded
  })

  if (!expanded) return null

  if (instancesQuery.isLoading) {
    return (
      <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
        {t('income.instancesLoading')}
      </div>
    )
  }

  const instances = [
    ...(instancesQuery.data ?? [])
  ].sort(
    (a: NormalizedIncomeInstance, b: NormalizedIncomeInstance) =>
      a.expectedDate.getTime() - b.expectedDate.getTime()
  )

  if (instances.length === 0) {
    return (
      <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
        {t('income.noInstances')}
      </div>
    )
  }

  return (
    <div className="rounded-md border bg-muted/20">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('income.instanceName')}</TableHead>
            <TableHead>{t('income.instanceExpectedDate')}</TableHead>
            <TableHead>{t('common.amount')}</TableHead>
            <TableHead>{t('common.account')}</TableHead>
            <TableHead>{t('common.category')}</TableHead>
            <TableHead>{t('income.instanceStatusLabel')}</TableHead>
            <TableHead className="text-right">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {instances.map((instance) => (
            <TableRow key={instance.id}>
              <TableCell className="font-medium">{instance.name}</TableCell>
              <TableCell>
                {format(instance.expectedDate, 'MMM d, yyyy')}
              </TableCell>
              <TableCell>{formatCurrency(instance.amount)}</TableCell>
              <TableCell>
                {accountsById.get(instance.accountId)?.name ?? '-'}
              </TableCell>
              <TableCell>
                {instance.categoryId
                  ? (categoriesById.get(instance.categoryId)?.name ?? '-')
                  : '-'}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={getIncomeInstanceStatusClass(instance.status)}
                >
                  {t(`income.instanceStatus.${instance.status.toLowerCase()}`)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outlined"
                    color="subtle"
                    onClick={() => onEditInstance(instance.id)}
                    icon={<Pencil />}
                    label={t('income.editInstance')}
                  />
                  <Button
                    variant="filled"
                    color="primary"
                    onClick={() => onRecordInstance(income, instance)}
                    disabled={instance.status === InstanceStatus.HANDLED}
                    icon={<ReceiptText />}
                    label={
                      instance.status === InstanceStatus.HANDLED
                        ? t('income.handled')
                        : t('income.recordIncome')
                    }
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function EditIncomeInstanceDrawerContent({
  instanceId,
  userId,
  accounts,
  categories,
  onClose,
  onSuccess
}: EditIncomeInstanceDrawerContentProps) {
  const { t } = useTranslation()
  const instanceQuery = useIncomeInstanceById({
    instanceId,
    userId,
    enabled: !!instanceId
  })
  const updateMutation = useUpdateIncomeInstance({
    onSuccess: () => {
      onSuccess()
      onClose()
      toast.success(t('income.instanceUpdateSuccess'))
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    }
  })

  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState(NO_CATEGORY_VALUE)
  const nameInputId = useId()
  const amountInputId = useId()
  const expectedDateInputId = useId()

  useEffect(() => {
    if (!instanceQuery.data) return
    setName(instanceQuery.data.name)
    setAmount(String(instanceQuery.data.amount))
    setExpectedDate(format(instanceQuery.data.expectedDate, 'yyyy-MM-dd'))
    setAccountId(instanceQuery.data.accountId)
    setCategoryId(instanceQuery.data.categoryId ?? NO_CATEGORY_VALUE)
  }, [
    instanceQuery.data
  ])

  if (instanceQuery.isLoading || !instanceQuery.data) {
    return (
      <div className="p-4">
        <p className="text-muted-foreground">{t('income.instancesLoading')}</p>
      </div>
    )
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsedAmount = Number.parseFloat(amount)
    if (!name || !accountId || !expectedDate || Number.isNaN(parsedAmount))
      return

    updateMutation.mutate({
      id: instanceId,
      userId,
      name,
      amount: parsedAmount,
      expectedDate: new Date(expectedDate),
      accountId,
      categoryId: categoryId === NO_CATEGORY_VALUE ? undefined : categoryId
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 p-4"
    >
      <div className="space-y-2">
        <Label htmlFor={nameInputId}>{t('common.name')}</Label>
        <Input
          id={nameInputId}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={amountInputId}>{t('common.amount')}</Label>
        <Input
          id={amountInputId}
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={expectedDateInputId}>
          {t('income.instanceExpectedDate')}
        </Label>
        <Input
          id={expectedDateInputId}
          type="date"
          value={expectedDate}
          onChange={(event) => setExpectedDate(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>{t('common.account')}</Label>
        <Select
          value={accountId}
          onValueChange={setAccountId}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('forms.selectAccount')} />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <SelectItem
                key={account.id}
                value={account.id}
              >
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>{t('common.category')}</Label>
        <Select
          value={categoryId}
          onValueChange={setCategoryId}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('forms.selectCategory')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_CATEGORY_VALUE}>
              {t('forms.noCategory')}
            </SelectItem>
            {categories.map((category) => (
              <SelectItem
                key={category.id}
                value={category.id}
              >
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outlined"
          color="subtle"
          onClick={onClose}
          label={t('common.cancel')}
        />
        <BaseButton
          type="submit"
          disabled={
            updateMutation.isPending ||
            !name ||
            !accountId ||
            !expectedDate ||
            !amount
          }
        >
          {updateMutation.isPending ? t('common.saving') : t('common.save')}
        </BaseButton>
      </div>
    </form>
  )
}

function IncomePage() {
  const { t } = useTranslation()
  const { userId, householdId } = useAuth()
  const queryClient = useQueryClient()
  const { openDrawer, closeDrawer, isOpen } = useDrawer()
  const { confirm, confirmDialog } = useConfirmDialog()
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false)
  const [expandedIncomeIds, setExpandedIncomeIds] = useState<
    Record<string, boolean>
  >({})

  useEffect(() => {
    if (!isOpen) {
      setIsTransactionFormOpen(false)
    }
  }, [
    isOpen
  ])

  const incomeQuery = useIncomeList({
    householdId,
    userId,
    includeArchived: true
  })

  const accountsQuery = useAccountsList({
    householdId,
    userId,
    excludeArchived: true
  })
  const selectableAccounts = (accountsQuery.data ?? []).filter(
    (account) => !account.archived
  )

  const categoriesQuery = useCategoriesList({
    householdId,
    userId,
    type: 'INCOME'
  })
  const incomeCategories = (categoriesQuery.data ?? []).map((category) => ({
    ...category,
    type: 'INCOME'
  }))
  const selectableIncomeCategories = incomeCategories.filter(
    (category) => !category.archived
  )

  const budgetsQuery = useBudgetsList({
    householdId,
    userId,
    enabled: !!householdId && isTransactionFormOpen
  })

  const { data: recipients } = useRecipientsList({
    householdId,
    userId,
    enabled: !!householdId && isTransactionFormOpen
  })
  const selectableRecipients = (recipients ?? []).filter(
    (recipient) => !recipient.archived
  )

  const createMutation = useCreateIncome({
    onSuccess: () => {
      incomeQuery.refetch()
      closeDrawer()
      toast.success(t('income.createSuccess'))
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    }
  })

  const updateMutation = useUpdateIncome({
    onSuccess: () => {
      incomeQuery.refetch()
      closeDrawer()
      toast.success(t('income.updateSuccess'))
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    }
  })

  const deleteMutation = useDeleteIncome({
    onSuccess: () => {
      incomeQuery.refetch()
      toast.success(t('income.deleteSuccess'))
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    }
  })

  const archiveMutation = useArchiveIncome({
    onSuccess: (_data, variables) => {
      incomeQuery.refetch()
      toast.success(
        variables.archived
          ? t('income.archiveSuccess')
          : t('income.unarchiveSuccess')
      )
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    }
  })

  const createTransactionMutation = useCreateTransaction({
    onSuccess: () => {
      void invalidateByOperation(queryClient, 'listIncomeInstances')
      void invalidateByOperation(queryClient, 'getIncomeInstance')
      setIsTransactionFormOpen(false)
      closeDrawer()
      toast.success(t('transactions.createSuccess'))
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    }
  })

  const incomeSourcesById = useMemo(
    () =>
      (incomeQuery.data ?? []).reduce<Record<string, IncomeSource>>(
        (accumulator, income) => {
          if (income.incomeSource) {
            accumulator[income.incomeSource.id] = income.incomeSource
          }
          return accumulator
        },
        {}
      ),
    [
      incomeQuery.data
    ]
  )

  const incomeSources = Object.values(incomeSourcesById).map(
    (incomeSource) => ({
      id: incomeSource.id,
      name: incomeSource.name,
      archived: incomeSource.archived
    })
  )
  const selectableIncomeSources = incomeSources
    .filter((incomeSource) => !incomeSource.archived)
    .map((incomeSource) => ({
      id: incomeSource.id,
      name: incomeSource.name
    }))

  const accountsById = useMemo(
    () =>
      new Map(
        (accountsQuery.data ?? []).map((account) => [
          account.id,
          {
            id: account.id,
            name: account.name,
            archived: account.archived
          }
        ])
      ),
    [
      accountsQuery.data
    ]
  )
  const categoriesById = useMemo(
    () =>
      new Map(
        (categoriesQuery.data ?? []).map((category) => [
          category.id,
          {
            id: category.id,
            name: category.name,
            types: category.types,
            archived: category.archived
          }
        ])
      ),
    [
      categoriesQuery.data
    ]
  )

  const getIncomeSourceName = (income: NormalizedIncome): string => {
    if (income.incomeSource?.name) return income.incomeSource.name
    return incomeSourcesById[income.incomeSourceId]?.name ?? ''
  }

  const getRecurrenceLabel = (
    type: RecurrenceType,
    customDays?: number | null
  ) => {
    switch (type) {
      case RecurrenceType.NONE:
        return t('income.oneTime')
      case RecurrenceType.WEEKLY:
        return t('income.weekly')
      case RecurrenceType.MONTHLY:
        return t('income.monthly')
      case RecurrenceType.QUARTERLY:
        return t('income.quarterly')
      case RecurrenceType.YEARLY:
        return t('income.yearly')
      case RecurrenceType.CUSTOM:
        return t('income.custom', {
          days: customDays
        })
      default:
        return type
    }
  }

  const toggleExpanded = (incomeId: string) => {
    setExpandedIncomeIds((current) => ({
      ...current,
      [incomeId]: !current[incomeId]
    }))
  }

  const handleCreate = () => {
    if (!householdId) return
    const currentHouseholdId = householdId
    setIsTransactionFormOpen(false)
    openDrawer(
      <div className="p-4">
        <h2 className="mb-4 text-2xl font-bold">{t('income.add')}</h2>
        <p className="mb-6 text-muted-foreground">{t('income.createDesc')}</p>
        {accountsQuery.data && categoriesQuery.data ? (
          <IncomeForm
            onSubmit={(data) => {
              const incomeSourceData = data.incomeSource
                ? typeof data.incomeSource === 'string'
                  ? {
                      incomeSourceId: data.incomeSource
                    }
                  : {
                      newIncomeSourceName: data.incomeSource.name
                    }
                : {}

              const categoryData =
                typeof data.category === 'string'
                  ? {
                      categoryId: data.category
                    }
                  : {
                      newCategoryName: data.category.name
                    }

              createMutation.mutate({
                name: data.name,
                amount: data.amount,
                expectedDate: data.expectedDate,
                accountId: data.accountId,
                ...incomeSourceData,
                ...categoryData,
                recurrenceType: data.recurrenceType,
                customIntervalDays: data.customIntervalDays ?? undefined,
                endDate: data.endDate ?? undefined,
                userId,
                householdId: currentHouseholdId
              })
            }}
            onCancel={closeDrawer}
            accounts={selectableAccounts}
            categories={selectableIncomeCategories}
            incomeSources={selectableIncomeSources}
          />
        ) : (
          <div className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">{t('income.loadingForm')}</p>
          </div>
        )}
      </div>,
      t('income.add')
    )
  }

  const handleEdit = (income: NormalizedIncome) => {
    setIsTransactionFormOpen(false)
    openDrawer(
      <div className="p-4">
        <h2 className="mb-4 text-2xl font-bold">{t('income.edit')}</h2>
        <p className="mb-6 text-muted-foreground">{t('income.editDesc')}</p>
        {accountsQuery.data && categoriesQuery.data ? (
          <IncomeForm
            defaultValues={{
              name: income.name,
              incomeSource: income.incomeSourceId ?? null,
              amount: income.estimatedAmount,
              expectedDate: income.expectedDate,
              accountId: income.accountId,
              category: income.categoryId,
              recurrenceType: income.recurrenceType,
              customIntervalDays: income.customIntervalDays,
              endDate: income.endDate ?? null
            }}
            onSubmit={(data) => {
              const incomeSourceData = data.incomeSource
                ? typeof data.incomeSource === 'string'
                  ? {
                      incomeSourceId: data.incomeSource
                    }
                  : {
                      newIncomeSourceName: data.incomeSource.name
                    }
                : {
                    incomeSourceId: undefined,
                    newIncomeSourceName: undefined
                  }

              const categoryData =
                typeof data.category === 'string'
                  ? {
                      categoryId: data.category
                    }
                  : {
                      newCategoryName: data.category.name
                    }

              updateMutation.mutate({
                id: income.id,
                userId,
                name: data.name,
                amount: data.amount,
                expectedDate: data.expectedDate,
                accountId: data.accountId,
                ...incomeSourceData,
                ...categoryData,
                recurrenceType: data.recurrenceType,
                customIntervalDays: data.customIntervalDays ?? undefined,
                endDate: data.endDate ?? undefined
              })
            }}
            onCancel={closeDrawer}
            accounts={selectableAccounts}
            categories={incomeCategories}
            incomeSources={incomeSources.map((incomeSource) => ({
              id: incomeSource.id,
              name: incomeSource.name
            }))}
          />
        ) : (
          <div className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">{t('income.loadingForm')}</p>
          </div>
        )}
      </div>,
      t('income.edit')
    )
  }

  const handleEditInstance = (instanceId: string) => {
    openDrawer(
      <EditIncomeInstanceDrawerContent
        instanceId={instanceId}
        userId={userId}
        accounts={selectableAccounts.map((account) => ({
          id: account.id,
          name: account.name,
          archived: account.archived
        }))}
        categories={selectableIncomeCategories.map((category) => ({
          id: category.id,
          name: category.name,
          types: category.types,
          archived: category.archived
        }))}
        onClose={closeDrawer}
        onSuccess={() => {
          void invalidateByOperation(queryClient, 'listIncomeInstances')
          void invalidateByOperation(queryClient, 'getIncomeInstance')
        }}
      />,
      t('income.editInstance')
    )
  }

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      description: t('income.deleteConfirm'),
      confirmText: t('common.delete')
    })
    if (!isConfirmed) return
    deleteMutation.mutate({
      id,
      userId
    })
  }

  const handleArchive = (id: string, archived: boolean) => {
    archiveMutation.mutate({
      id,
      archived,
      userId
    })
  }

  const handleRecordIncome = (
    income: NormalizedIncome,
    instance: NormalizedIncomeInstance
  ) => {
    setIsTransactionFormOpen(true)
    openDrawer(
      <div className="p-4">
        <h2 className="mb-4 text-2xl font-bold">{t('income.recordIncome')}</h2>
        <p className="mb-6 text-muted-foreground">
          {t('income.recordIncomeDesc')}
        </p>
        {accountsQuery.data && categoriesQuery.data ? (
          <TransactionForm
            categories={selectableIncomeCategories}
            accounts={selectableAccounts}
            budgets={budgetsQuery.data ?? []}
            recipients={selectableRecipients}
            defaultValues={{
              name: instance.name,
              amount: instance.amount,
              date: instance.expectedDate,
              categoryId: instance.categoryId ?? undefined,
              accountId: instance.accountId,
              transactionType: 'INCOME',
              notes: t('income.recordInstanceNote', {
                source: getIncomeSourceName(income)
              })
            }}
            onSubmit={(data) => {
              const categoryData =
                typeof data.category === 'string'
                  ? {
                      categoryId: data.category
                    }
                  : data.category
                    ? {
                        newCategory: {
                          name: data.category.name,
                          type: TransactionType.INCOME
                        }
                      }
                    : {}

              const recipientData = data.recipient
                ? typeof data.recipient === 'string'
                  ? {
                      recipientId: data.recipient
                    }
                  : {
                      newRecipientName: data.recipient.name
                    }
                : {}

              createTransactionMutation.mutate({
                type: TransactionType.INCOME,
                name: data.name,
                amount: data.amount,
                date: data.date,
                accountId: data.accountId,
                notes: data.notes,
                instanceId: instance.id,
                budgetId: data.budgetId || undefined,
                userId,
                ...categoryData,
                ...recipientData
              })
            }}
            onCancel={() => {
              setIsTransactionFormOpen(false)
              closeDrawer()
            }}
            submitLabel={t('income.recordIncome')}
          />
        ) : (
          <div className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">{t('income.loadingForm')}</p>
          </div>
        )}
      </div>,
      t('income.recordIncome')
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-end gap-2">
          <Button
            onClick={handleCreate}
            icon={<Plus />}
            label={t('income.add')}
          />
        </div>

        {incomeQuery.isLoading ? (
          <div className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">{t('income.loading')}</p>
          </div>
        ) : !(incomeQuery.data && incomeQuery.data.length > 0) ? (
          <SetupPrompt
            variant="no-income"
            onAction={handleCreate}
          />
        ) : (
          <Card>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>{t('common.name')}</TableHead>
                    <TableHead>{t('income.source')}</TableHead>
                    <TableHead>{t('common.account')}</TableHead>
                    <TableHead>{t('common.amount')}</TableHead>
                    <TableHead>{t('recurrence.label')}</TableHead>
                    <TableHead>{t('income.nextExpected')}</TableHead>
                    <TableHead>{t('common.category')}</TableHead>
                    <TableHead className="text-right">
                      {t('common.actions')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomeQuery.data?.map((income) => {
                    const isExpanded = !!expandedIncomeIds[income.id]

                    return (
                      <Fragment key={income.id}>
                        <TableRow
                          className={income.archived ? 'opacity-50' : ''}
                        >
                          <TableCell>
                            <IconButton
                              variant="text"
                              color="subtle"
                              icon={
                                isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )
                              }
                              onClick={() => toggleExpanded(income.id)}
                              aria-label={t('income.toggleInstances')}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {income.archived ? (
                              <Badge
                                variant="secondary"
                                className="mr-2"
                              >
                                {t('income.archived')}
                              </Badge>
                            ) : null}
                            {income.name}
                          </TableCell>
                          <TableCell>{getIncomeSourceName(income)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {income.account?.name ?? '-'}
                              {income.account?.archived ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>
                                        {t('income.archivedAccountWarning')}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatCurrency(income.estimatedAmount)}
                          </TableCell>
                          <TableCell>
                            {getRecurrenceLabel(
                              income.recurrenceType,
                              income.customIntervalDays
                            )}
                          </TableCell>
                          <TableCell>
                            {format(income.expectedDate, 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>{income.category?.name ?? '-'}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <BaseButton
                                  variant="text"
                                  color="subtle"
                                  iconOnly
                                >
                                  <MoreVerticalIcon className="h-4 w-4" />
                                </BaseButton>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => toggleExpanded(income.id)}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="mr-2 h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="mr-2 h-4 w-4" />
                                  )}
                                  {t('income.viewInstances')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleEdit(income)}
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  {t('common.edit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    income.archived
                                      ? handleArchive(income.id, false)
                                      : handleArchive(income.id, true)
                                  }
                                >
                                  {income.archived ? (
                                    <>
                                      <ArchiveRestore className="mr-2 h-4 w-4" />
                                      {t('common.unarchive')}
                                    </>
                                  ) : (
                                    <>
                                      <Archive className="mr-2 h-4 w-4" />
                                      {t('common.archive')}
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(income.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {t('common.delete')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                        {isExpanded ? (
                          <TableRow>
                            <TableCell
                              colSpan={9}
                              className="bg-muted/10"
                            >
                              <div className="space-y-3 py-2">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">
                                      {t('income.instancesSectionTitle')}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {t('income.instancesSectionDescription')}
                                    </p>
                                  </div>
                                </div>
                                <IncomeInstancesSection
                                  income={income}
                                  expanded={isExpanded}
                                  userId={userId}
                                  accountsById={accountsById}
                                  categoriesById={categoriesById}
                                  onEditInstance={handleEditInstance}
                                  onRecordInstance={handleRecordIncome}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
      {confirmDialog}
    </>
  )
}
