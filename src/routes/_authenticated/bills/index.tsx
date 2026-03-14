/**
 * Bills Page - List and manage bills
 */

import { createFileRoute } from '@tanstack/react-router'
import { endOfMonth, format, startOfMonth } from 'date-fns'
import {
  ArchiveIcon,
  Edit2Icon,
  MoreVerticalIcon,
  PlusIcon,
  ReceiptIcon,
  TrashIcon
} from 'lucide-react'
import { type FormEvent, useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  BillUpdateType,
  type BillInstance,
  InstanceStatus,
  RecurrenceType,
  TransactionType
} from '@/api/generated/types.gen'
import { BillForm } from '@/components/bills/BillForm'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import {
  useAccountsList,
  useArchiveBill,
  useBudgetsList,
  useCategoriesList,
  useCreateBill,
  useCreateTransaction,
  useDeleteBill,
  useRecipientsList,
  useTransactionsList
} from '@/hooks/api'
import { useUpdateBillInstance } from '@/hooks/api/mutations/use-bills-mutations'
import { useBillInstancesList } from '@/hooks/api/queries/use-bills-query'
import { useDrawer } from '@/hooks/use-drawer'
import { useConfirmDialog } from '@/hooks/use-confirm-dialog'
import { getErrorMessage } from '@/lib/api-error'
import { formatCurrency } from '@/lib/utils'

// Search params schema
const billsSearchSchema = z.object({
  budgetId: z.string().optional()
})

export const Route = createFileRoute('/_authenticated/bills/')({
  component: BillsPage,
  validateSearch: (search) => billsSearchSchema.parse(search)
})

type NormalizedBillInstance = Omit<BillInstance, 'dueDate' | 'startDate'> & {
  dueDate: Date
  startDate: Date
}

type BillInstanceEditDrawerContentProps = {
  bill: NormalizedBillInstance
  accounts: Array<{
    id: string
    name: string
  }>
  categories: Array<{
    id: string
    name: string
  }>
  onClose: () => void
  onSubmit: (data: {
    name: string
    recipient: string
    amount: number
    dueDate: Date
    accountId: string
    categoryId?: string
    updateType: BillUpdateType
  }) => void
  isSubmitting: boolean
}

const NO_CATEGORY_VALUE = '__none__'

function getBillStatusBadgeClass(status: InstanceStatus): string {
  switch (status) {
    case InstanceStatus.HANDLED:
      return 'border-green-200 bg-green-50 text-green-700'
    case InstanceStatus.DUE:
      return 'border-amber-200 bg-amber-50 text-amber-700'
    default:
      return 'border-muted-foreground/20 bg-muted text-muted-foreground'
  }
}

function BillInstanceEditDrawerContent({
  bill,
  accounts,
  categories,
  onClose,
  onSubmit,
  isSubmitting
}: BillInstanceEditDrawerContentProps) {
  const { t } = useTranslation()
  const nameId = useId()
  const recipientId = useId()
  const amountId = useId()
  const dueDateId = useId()
  const [name, setName] = useState(bill.name)
  const [recipient, setRecipient] = useState(bill.recipient.name ?? '')
  const [amount, setAmount] = useState(String(bill.amount))
  const [dueDate, setDueDate] = useState(format(bill.dueDate, 'yyyy-MM-dd'))
  const [accountId, setAccountId] = useState(bill.account?.id ?? '')
  const [categoryId, setCategoryId] = useState(
    bill.category?.id ?? NO_CATEGORY_VALUE
  )
  const [updateType, setUpdateType] = useState<BillUpdateType>(
    BillUpdateType.INSTANCE
  )

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsedAmount = Number.parseFloat(amount)
    if (
      !name ||
      !recipient ||
      !accountId ||
      !dueDate ||
      Number.isNaN(parsedAmount)
    ) {
      return
    }

    onSubmit({
      name,
      recipient,
      amount: parsedAmount,
      dueDate: new Date(dueDate),
      accountId,
      categoryId: categoryId === NO_CATEGORY_VALUE ? undefined : categoryId,
      updateType
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 p-4"
    >
      <div className="space-y-2">
        <Label htmlFor={nameId}>{t('common.name')}</Label>
        <Input
          id={nameId}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={recipientId}>{t('common.recipient')}</Label>
        <Input
          id={recipientId}
          value={recipient}
          onChange={(event) => setRecipient(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={amountId}>{t('common.amount')}</Label>
        <Input
          id={amountId}
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={dueDateId}>{t('forms.nextExpectedDate')}</Label>
        <Input
          id={dueDateId}
          type="date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
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
      <div className="space-y-2">
        <Label>{t('bills.updateScope')}</Label>
        <Select
          value={updateType}
          onValueChange={(value) => setUpdateType(value as BillUpdateType)}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('bills.updateScope')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={BillUpdateType.INSTANCE}>
              {t('bills.updateType.instance')}
            </SelectItem>
            <SelectItem value={BillUpdateType.FUTURE}>
              {t('bills.updateType.future')}
            </SelectItem>
            <SelectItem value={BillUpdateType.ALL}>
              {t('bills.updateType.all')}
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {t('bills.updateTypeDescription')}
        </p>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
        >
          {t('common.cancel')}
        </Button>
        <Button
          type="submit"
          disabled={
            isSubmitting ||
            !name ||
            !recipient ||
            !accountId ||
            !amount ||
            !dueDate
          }
        >
          {isSubmitting ? t('common.saving') : t('common.save')}
        </Button>
      </div>
    </form>
  )
}

function BillsPage() {
  const { t } = useTranslation()
  const { budgetId: urlBudgetId } = Route.useSearch()
  const { userId, householdId } = useAuth()
  const { openDrawer, closeDrawer } = useDrawer()
  const { confirm, confirmDialog } = useConfirmDialog()

  const [thisMonthOnly, setThisMonthOnly] = useState(false)
  const [includeArchived, setIncludeArchived] = useState(false)
  const [budgetFilter, setBudgetFilter] = useState(urlBudgetId ?? '__all__')
  const { data: budgets } = useBudgetsList({
    householdId,
    userId
  })
  const selectedBudgetId = budgetFilter === '__all__' ? undefined : budgetFilter

  const billsQuery = useBillInstancesList({
    householdId,
    budgetId: selectedBudgetId,
    includeArchived,
    dateFrom: thisMonthOnly ? startOfMonth(new Date()) : undefined,
    dateTo: thisMonthOnly ? endOfMonth(new Date()) : undefined,
    enabled: !!householdId
  })

  // Fetch accounts for form
  const accountsQuery = useAccountsList({
    householdId,
    userId,
    excludeArchived: true
  })

  // Fetch categories for form (expense categories only)
  const categoriesQuery = useCategoriesList({
    householdId,
    userId,
    type: 'EXPENSE'
  })

  const { data: recipientsData } = useRecipientsList({
    householdId,
    userId,
    enabled: !!householdId
  })
  const recipients = recipientsData ?? []
  const selectableRecipients = recipients.filter(
    (recipient) => !recipient.archived
  )

  // Categories are already filtered for EXPENSE type in the query
  const expenseCategories = (categoriesQuery.data ?? []).filter(
    (category) => !category.archived
  )
  const transactionsQuery = useTransactionsList({
    householdId,
    userId,
    enabled: !!householdId
  })
  const transactionsById = useMemo(
    () =>
      new Map(
        (transactionsQuery.data ?? []).map((transaction) => [
          transaction.id,
          transaction
        ])
      ),
    [
      transactionsQuery.data
    ]
  )

  // Create mutation
  const createMutation = useCreateBill({
    onSuccess: () => {
      billsQuery.refetch()
      closeDrawer()
      toast.success(t('bills.createSuccess'))
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
      console.error('Error creating bill', getErrorMessage(error))
    }
  })

  // Create transaction mutation
  const createTransactionMutation = useCreateTransaction({
    onSuccess: () => {
      closeDrawer()
      billsQuery.refetch()
      transactionsQuery.refetch()
      toast.success(t('transactions.createSuccess'))
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    }
  })

  const updateInstanceMutation = useUpdateBillInstance({
    onSuccess: () => {
      billsQuery.refetch()
      transactionsQuery.refetch()
      closeDrawer()
      toast.success(t('bills.updateSuccess'))
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    }
  })

  // Delete mutation
  const deleteMutation = useDeleteBill({
    onSuccess: () => {
      billsQuery.refetch()
      toast.success(t('bills.deleteSuccess'))
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    }
  })

  // Archive mutation
  const archiveMutation = useArchiveBill({
    onSuccess: (_data, variables) => {
      billsQuery.refetch()
      toast.success(
        variables.archived
          ? t('bills.archiveSuccess')
          : t('bills.unarchiveSuccess')
      )
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    }
  })

  const getBillRecipientName = (bill: {
    recipient: {
      name: string | null
    }
  }): string => bill.recipient.name ?? ''

  const handleCreate = () => {
    if (!householdId) return
    const currentHouseholdId = householdId
    openDrawer(
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">{t('bills.createBill')}</h2>
        <p className="text-muted-foreground mb-6">
          {t('bills.createBillDesc')}
        </p>
        {accountsQuery.data && categoriesQuery.data ? (
          <BillForm
            initialData={{
              budgetId: selectedBudgetId
            }}
            onSubmit={(data) => {
              const splitsData = data.splits
                ?.map((s) => {
                  const categoryId =
                    typeof s.category === 'string' ? s.category : undefined
                  const newCategoryName =
                    typeof s.category === 'object' && s.category.isNew
                      ? s.category.name
                      : undefined
                  return {
                    subtitle: s.subtitle,
                    amount: s.amount,
                    categoryId,
                    newCategoryName
                  }
                })
                .filter((s) => s.categoryId || s.newCategoryName)

              const recipientData =
                typeof data.recipient === 'string'
                  ? {
                      recipientId: data.recipient
                    }
                  : {
                      newRecipientName: data.recipient.name
                    }

              createMutation.mutate({
                name: data.name,
                ...recipientData,
                accountId: data.accountId,
                budgetId: data.budgetId || selectedBudgetId || undefined,
                startDate: data.startDate,
                recurrenceType: data.recurrenceType,
                customIntervalDays: data.customIntervalDays ?? undefined,
                estimatedAmount: data.splits.reduce(
                  (sum, s) => sum + s.amount,
                  0
                ),
                endDate: data.endDate ?? undefined,
                lastPaymentDate: data.lastPaymentDate ?? undefined,
                householdId: currentHouseholdId,
                userId,
                splits: splitsData
              })
            }}
            onCancel={closeDrawer}
            accounts={accountsQuery.data}
            budgets={budgets ?? []}
            categories={expenseCategories}
            recipients={selectableRecipients}
            isSubmitting={createMutation.isPending}
          />
        ) : (
          <div className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </div>
        )}
      </div>,
      t('bills.createBill')
    )
  }

  const handleEditBillInstance = (bill: NormalizedBillInstance) => {
    openDrawer(
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">{t('bills.editBill')}</h2>
        <p className="text-muted-foreground mb-6">
          {t('bills.editInstanceDesc')}
        </p>
        <BillInstanceEditDrawerContent
          bill={bill}
          accounts={accountsQuery.data ?? []}
          categories={expenseCategories}
          isSubmitting={updateInstanceMutation.isPending}
          onClose={closeDrawer}
          onSubmit={(data) => {
            updateInstanceMutation.mutate({
              id: bill.id,
              userId,
              name: data.name,
              recipient: data.recipient,
              amount: data.amount,
              dueDate: data.dueDate,
              accountId: data.accountId,
              categoryId: data.categoryId,
              updateType: data.updateType
            })
          }}
        />
      </div>,
      t('bills.editBill')
    )
  }

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      description: t('bills.deleteConfirm'),
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

  const handleLinkTransaction = (bill: NormalizedBillInstance) => {
    openDrawer(
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">
          {t('bills.linkTransaction')}
        </h2>
        <p className="text-muted-foreground mb-6">
          {t('bills.linkTransactionDesc')}
        </p>
        <TransactionForm
          categories={expenseCategories}
          accounts={accountsQuery.data ?? []}
          budgets={budgets ?? []}
          recipients={selectableRecipients}
          isEditing
          defaultValues={{
            name: bill.name,
            amount: bill.amount,
            date: bill.dueDate,
            categoryId: bill.category?.id ?? undefined,
            budgetId: bill.budget?.id ?? selectedBudgetId ?? undefined,
            accountId: bill.account?.id ?? '',
            transactionType: 'EXPENSE',
            recipient: (() => {
              const match = recipients.find((r) => r.id === bill.recipient.id)
              if (match) return match.id
              return bill.recipient.name
                ? {
                    isNew: true,
                    name: bill.recipient.name
                  }
                : undefined
            })(),
            notes: `Payment for ${bill.name}`,
            splits: bill.splits?.map((s) => ({
              subtitle: s.subtitle,
              amount: s.amount,
              categoryId: s.category?.id ?? bill.category?.id ?? ''
            }))
          }}
          onSubmit={(data) => {
            const categoryData =
              typeof data.category === 'string' && data.category
                ? {
                    categoryId: data.category
                  }
                : data.category && typeof data.category === 'object'
                  ? {
                      newCategory: {
                        name: data.category.name,
                        type: TransactionType.EXPENSE
                      }
                    }
                  : {}

            const splitsData = data.splits
              ?.map((s) => ({
                subtitle: s.subtitle,
                amount: s.amount,
                categoryId: typeof s.category === 'string' ? s.category : ''
              }))
              .filter((s) => s.categoryId)

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
              type: TransactionType.EXPENSE,
              name: data.name,
              amount: data.amount,
              date: data.date,
              accountId: data.accountId,
              notes: data.notes,
              ...categoryData,
              ...recipientData,
              instanceId: bill.id,
              budgetId: data.budgetId || bill.budget?.id || undefined,
              userId,
              splits: splitsData
            })
          }}
          onCancel={closeDrawer}
          submitLabel={t('bills.linkTransaction')}
        />
      </div>,
      t('transactions.createTransaction')
    )
  }

  const getRecurrenceLabel = (type: RecurrenceType) => {
    switch (type) {
      case RecurrenceType.NONE:
        return t('recurrence.none')
      case RecurrenceType.WEEKLY:
        return t('recurrence.weekly')
      case RecurrenceType.MONTHLY:
        return t('recurrence.monthly')
      case RecurrenceType.QUARTERLY:
        return t('recurrence.quarterly')
      case RecurrenceType.YEARLY:
        return t('recurrence.yearly')
      case RecurrenceType.CUSTOM:
        return t('recurrence.custom')
      default:
        return type
    }
  }

  return (
    <>
      <div className="space-y-6">
        {/* Toolbar */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end">
          <Select
            value={budgetFilter}
            onValueChange={setBudgetFilter}
          >
            <SelectTrigger className="w-full md:w-56">
              <SelectValue placeholder={t('forms.selectBudget')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t('transactions.all')}</SelectItem>
              {(budgets ?? []).map((budget) => (
                <SelectItem
                  key={budget.id}
                  value={budget.id}
                >
                  {budget.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={thisMonthOnly ? 'default' : 'outline'}
            onClick={() => setThisMonthOnly(!thisMonthOnly)}
            size="sm"
          >
            {t('bills.thisMonth')}
          </Button>
          <Button
            variant={includeArchived ? 'default' : 'outline'}
            onClick={() => setIncludeArchived(!includeArchived)}
            size="sm"
          >
            {includeArchived
              ? t('bills.hideArchived')
              : t('bills.showArchived')}
          </Button>
          <Button onClick={handleCreate}>
            <PlusIcon className="h-4 w-4 mr-2" />
            {t('bills.newBill')}
          </Button>
        </div>
        <Card>
          <CardContent>
            {billsQuery.isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('common.loading')}
              </div>
            ) : billsQuery.data?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('bills.noBills')}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.name')}</TableHead>
                    <TableHead>{t('common.recipient')}</TableHead>
                    <TableHead>{t('common.account')}</TableHead>
                    <TableHead>{t('common.amount')}</TableHead>
                    <TableHead>{t('recurrence.label')}</TableHead>
                    <TableHead>{t('forms.nextExpectedDate')}</TableHead>
                    <TableHead>{t('bills.status')}</TableHead>
                    <TableHead>{t('common.category')}</TableHead>
                    <TableHead>{t('bills.linkedTransaction')}</TableHead>
                    <TableHead className="text-right">
                      {t('common.actions')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billsQuery.data?.map((bill) => {
                    const hasSplits = bill.splits && bill.splits.length > 0
                    const linkedTransaction = bill.transaction?.id
                      ? transactionsById.get(bill.transaction.id)
                      : undefined

                    return (
                      <TableRow
                        key={bill.id}
                        className={bill.archived ? 'opacity-50' : ''}
                      >
                        <TableCell className="font-medium">
                          {bill.name}
                          {bill.archived && (
                            <Badge
                              variant="secondary"
                              className="ml-2"
                            >
                              {t('common.archived')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{getBillRecipientName(bill)}</TableCell>
                        <TableCell>{bill.account?.name ?? '-'}</TableCell>
                        <TableCell>{formatCurrency(bill.amount)}</TableCell>
                        <TableCell>
                          {getRecurrenceLabel(bill.recurrenceType)}
                        </TableCell>
                        <TableCell>
                          {format(bill.dueDate, 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getBillStatusBadgeClass(bill.status)}
                          >
                            {t(
                              `bills.instanceStatus.${bill.status.toLowerCase()}`
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {hasSplits ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    className="cursor-help"
                                  >
                                    {(bill.splits ?? []).length}{' '}
                                    {t('bills.sections')}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="w-64 p-0">
                                  <div className="p-2 space-y-2">
                                    <p className="font-semibold text-xs border-b pb-1">
                                      {t('bills.sections')}
                                    </p>
                                    {(bill.splits ?? []).map((s, i: number) => (
                                      <div
                                        key={`${i}-${s.amount}`}
                                        className="flex justify-between text-xs"
                                      >
                                        <span>
                                          {s.subtitle || s.category?.name}
                                        </span>
                                        <span>{formatCurrency(s.amount)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            (bill.category?.name ?? '-')
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {bill.status === InstanceStatus.HANDLED &&
                          bill.transaction?.id ? (
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">
                                {linkedTransaction?.name ??
                                  t('bills.linkedTransactionFallback')}
                              </p>
                              <p>
                                {linkedTransaction
                                  ? `${format(linkedTransaction.date, 'MMM d, yyyy')} · ${formatCurrency(linkedTransaction.amount)}`
                                  : bill.transaction.id}
                              </p>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleLinkTransaction(bill)}
                            >
                              <ReceiptIcon className="mr-2 h-4 w-4" />
                              {t('transactions.createTransaction')}
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                              >
                                <MoreVerticalIcon className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {bill.status !== InstanceStatus.HANDLED && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleLinkTransaction(bill)}
                                  >
                                    <ReceiptIcon className="h-4 w-4 mr-2" />
                                    {t('bills.linkTransaction')}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              {bill.status !== InstanceStatus.HANDLED ? (
                                <DropdownMenuItem
                                  onClick={() => handleEditBillInstance(bill)}
                                >
                                  <Edit2Icon className="h-4 w-4 mr-2" />
                                  {t('common.edit')}
                                </DropdownMenuItem>
                              ) : null}
                              <DropdownMenuItem
                                onClick={() => {
                                  if (!bill.bill?.id) return
                                  handleArchive(bill.bill.id, !bill.archived)
                                }}
                              >
                                <ArchiveIcon className="h-4 w-4 mr-2" />
                                {bill.archived
                                  ? t('common.unarchive')
                                  : t('common.archive')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  if (!bill.bill?.id) return
                                  handleDelete(bill.bill.id)
                                }}
                                className="text-destructive"
                              >
                                <TrashIcon className="h-4 w-4 mr-2" />
                                {t('common.delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      {confirmDialog}
    </>
  )
}
