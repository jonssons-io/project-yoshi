/**
 * Transactions page - Manage income, expense, and transfer transactions
 */

import { createFileRoute } from '@tanstack/react-router'
import { format } from 'date-fns'
import { CopyIcon, MoreVerticalIcon, PencilIcon, TrashIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  type Transaction,
  TransactionStatus,
  TransactionType
} from '@/api/generated/types.gen'
import { CreateTransactionButton } from '@/components/transactions/CreateTransactionButton'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { CreateTransferButton } from '@/components/transfers/CreateTransferButton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
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
import { useAuth } from '@/contexts/auth-context'
import {
  useAccountsList,
  useBudgetsList,
  useCategoriesList,
  useCloneTransaction,
  useDeleteTransaction,
  useRecipientsList,
  useTransactionsList,
  useUpdateTransaction
} from '@/hooks/api'
import { useConfirmDialog } from '@/hooks/use-confirm-dialog'
import { useDrawer } from '@/hooks/use-drawer'
import { getErrorMessage } from '@/lib/api-error'
import { formatCurrency } from '@/lib/utils'

// Search params schema
const transactionsSearchSchema = z.object({
  budgetId: z.string().optional(),
  createFromBill: z.string().optional()
})

export const Route = createFileRoute('/_authenticated/transactions/')({
  component: TransactionsPage,
  validateSearch: (search) => transactionsSearchSchema.parse(search)
})

const ALL_BUDGETS_VALUE = '__all_budgets__'
type TransactionListItem = Omit<Transaction, 'date'> & {
  date: Date
}

function TransactionsPage() {
  const { budgetId: urlBudgetId, createFromBill } = Route.useSearch()
  const { userId, householdId } = useAuth()
  const { openDrawer, closeDrawer } = useDrawer()
  const { confirm, confirmDialog } = useConfirmDialog()
  const { t } = useTranslation()
  const [budgetFilter, setBudgetFilter] = useState(
    urlBudgetId ?? ALL_BUDGETS_VALUE
  )
  const [filter, setFilter] = useState<
    'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER'
  >('ALL')
  const budgetId = budgetFilter === ALL_BUDGETS_VALUE ? undefined : budgetFilter

  // All hooks must be called before any early returns
  const {
    data: transactions,
    isLoading,
    refetch
  } = useTransactionsList({
    householdId,
    budgetId,
    userId,
    enabled: !!householdId
  })

  const { data: categories } = useCategoriesList({
    householdId,
    userId,
    budgetId: budgetId || undefined,
    enabled: !!householdId
  })

  const { data: accounts } = useAccountsList({
    householdId,
    userId,
    budgetId,
    enabled: !!householdId,
    excludeArchived: true
  })

  const { data: recipients } = useRecipientsList({
    householdId,
    userId,
    enabled: !!householdId
  })

  const { data: budgets } = useBudgetsList({
    householdId,
    userId
  })

  const { mutate: updateTransaction } = useUpdateTransaction({
    onSuccess: () => {
      refetch()
      closeDrawer()
      toast.success(t('transactions.updateSuccess'))
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    }
  })

  const { mutate: deleteTransaction } = useDeleteTransaction({
    onSuccess: () => {
      refetch()
      toast.success(t('transactions.deleteSuccess'))
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    }
  })

  const { mutate: cloneTransaction } = useCloneTransaction({
    onSuccess: () => {
      refetch()
      toast.success(t('transactions.cloneSuccess'))
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    }
  })

  // Handlers for edit are still needed, but create handlers are extracted to buttons

  const handleEditTransaction = (transaction: TransactionListItem) => {
    const type = getTransactionType(transaction)
    openDrawer(
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">{t('transactions.edit')}</h2>
        <p className="text-muted-foreground mb-6">
          {t('transactions.updateInfo')}
        </p>
        {categories && accounts ? (
          <TransactionForm
            defaultValues={{
              name: transaction.name,
              amount: transaction.amount,
              date: transaction.date,
              categoryId: transaction.category?.id ?? undefined,
              budgetId: transaction.budget?.id ?? undefined,
              accountId: transaction.account.id,
              transferToAccountId:
                transaction.transferToAccount?.id ?? undefined,
              recipientId: transaction.recipient?.id ?? null,
              instanceId:
                transaction.billInstance?.id ??
                transaction.incomeInstance?.id ??
                null,
              notes: transaction.notes ?? '',
              transactionType: type as 'INCOME' | 'EXPENSE' | 'TRANSFER',
              splits:
                transaction.splits && transaction.splits.length > 0
                  ? transaction.splits.map((s) => ({
                      subtitle: s.subtitle,
                      amount: s.amount,
                      categoryId: s.categoryId
                    }))
                  : undefined
            }}
            categories={categories}
            accounts={accounts}
            recipients={recipients}
            budgets={budgets ?? []}
            isEditing={true}
            onSubmit={async (data) => {
              if (data.transactionType === TransactionType.TRANSFER) {
                updateTransaction({
                  id: transaction.id,
                  userId,
                  type: TransactionType.TRANSFER,
                  name: data.name,
                  amount: data.amount,
                  date: data.date,
                  accountId: data.accountId,
                  transferToAccountId: data.transferToAccountId || undefined,
                  notes: data.notes
                })
                return
              }

              // For updates, transform category to categoryId
              const categoryId =
                typeof data.category === 'string' ? data.category : undefined

              // Transform recipient field to API format for updates
              const recipientId = data.recipient
                ? typeof data.recipient === 'string'
                  ? data.recipient
                  : undefined // New recipients during edit not supported yet
                : null

              // Transform splits if present
              const splits = data.splits
                ?.map((s) => ({
                  subtitle: s.subtitle,
                  amount: s.amount,
                  categoryId:
                    typeof s.category === 'string' ? s.category : undefined
                  // Note: We currently don't handle new category creation within splits during edit
                  // if the router doesn't support it. The form allows it, but we might need
                  // to creating them first if needed, or rely on router update.
                  // For now assuming existing categories as user reported switching valid categories.
                }))
                .filter((s) => s.categoryId) as Array<{
                subtitle: string
                amount: number
                categoryId: string
              }>

              updateTransaction({
                id: transaction.id,
                userId,
                type: data.transactionType,
                name: data.name,
                amount: data.amount,
                date: data.date,
                accountId: data.accountId,
                notes: data.notes,
                budgetId:
                  data.transactionType === TransactionType.EXPENSE
                    ? data.budgetId || undefined
                    : undefined,
                categoryId,
                recipientId: recipientId ?? undefined,
                instanceId: data.instanceId || undefined,
                splits
              })
            }}
            onCancel={closeDrawer}
            submitLabel={t('transactions.update')}
          />
        ) : (
          <div className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </div>
        )}
      </div>,
      t('transactions.edit')
    )
  }

  const handleEditTransfer = (transfer: {
    id: string
    name: string
    budgetId?: string | null
    amount: number
    date: Date
    fromAccountId: string
    toAccountId?: string | null
    notes: string | null
  }) => {
    openDrawer(
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">{t('transfers.edit')}</h2>
        <p className="text-muted-foreground mb-6">
          {t('transfers.updateInfo')}
        </p>
        {accounts && categories ? (
          <TransactionForm
            defaultValues={{
              name: transfer.name,
              amount: transfer.amount,
              date: transfer.date,
              accountId: transfer.fromAccountId,
              transferToAccountId: transfer.toAccountId ?? '',
              notes: transfer.notes ?? '',
              transactionType: TransactionType.TRANSFER
            }}
            categories={categories}
            accounts={accounts}
            recipients={recipients}
            budgets={budgets ?? []}
            isEditing={true}
            onSubmit={async (data) => {
              updateTransaction({
                id: transfer.id,
                userId,
                type: TransactionType.TRANSFER,
                name: data.name,
                amount: data.amount,
                date: data.date,
                accountId: data.accountId,
                transferToAccountId: data.transferToAccountId || undefined,
                notes: data.notes
              })
            }}
            onCancel={closeDrawer}
            submitLabel={t('transfers.update')}
          />
        ) : (
          <div className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </div>
        )}
      </div>,
      t('transfers.edit')
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  }

  const getTransactionType = (transaction: {
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  }) => transaction.type
  const getTransactionTypeLabel = (type: 'INCOME' | 'EXPENSE' | 'TRANSFER') => {
    switch (type) {
      case 'INCOME':
        return t('transactions.income')
      case 'EXPENSE':
        return t('transactions.expense')
      case 'TRANSFER':
        return t('common.transfer')
    }
  }
  const getTransactionTypeBadgeVariant = (
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  ): 'default' | 'secondary' | 'outline' => {
    switch (type) {
      case 'INCOME':
        return 'default'
      case 'EXPENSE':
        return 'secondary'
      case 'TRANSFER':
        return 'outline'
    }
  }
  const getTransactionStatusBadgeClass = (status: 'PENDING' | 'EFFECTIVE') =>
    status === TransactionStatus.PENDING
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700'

  const incomeTransactions =
    transactions?.filter(
      (transaction) => getTransactionType(transaction) === 'INCOME'
    ) ?? []
  const expenseTransactions =
    transactions?.filter(
      (transaction) => getTransactionType(transaction) === 'EXPENSE'
    ) ?? []
  const transferTransactions =
    transactions?.filter(
      (transaction) => getTransactionType(transaction) === 'TRANSFER'
    ) ?? []
  const visibleTransactions =
    filter === 'ALL'
      ? (transactions ?? [])
      : (transactions?.filter(
          (transaction) => getTransactionType(transaction) === filter
        ) ?? [])
  const totalInitialBalance =
    accounts?.reduce((sum, a) => sum + a.initialBalance, 0) ?? 0
  const totalIncome =
    (incomeTransactions?.reduce((sum, t) => sum + t.amount, 0) ?? 0) +
    totalInitialBalance
  const totalExpense =
    expenseTransactions?.reduce((sum, t) => sum + t.amount, 0) ?? 0
  const allFilterLabel = `${t('transactions.all')} (${transactions?.length ?? 0})`
  const incomeFilterLabel = `${t('transactions.income')} (${incomeTransactions?.length ?? 0})`
  const expenseFilterLabel = `${t('transactions.expense')} (${expenseTransactions?.length ?? 0})`
  const transferFilterLabel = `${t('common.transfer')} (${transferTransactions?.length ?? 0})`

  return (
    <>
      <div className="space-y-6">
        {/* Toolbar */}
        <div className="flex items-center justify-end gap-2">
          <CreateTransactionButton
            budgetId={budgetId}
            preSelectedBillId={createFromBill}
          />
          <CreateTransferButton budgetId={budgetId} />
        </div>
        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                {t('transactions.totalIncome')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalIncome)}
              </div>
              <p className="text-xs text-muted-foreground">
                {incomeTransactions?.length ?? 0}{' '}
                {t('transactions.title').toLowerCase()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                {t('transactions.totalExpenses')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totalExpense)}
              </div>
              <p className="text-xs text-muted-foreground">
                {expenseTransactions?.length ?? 0}{' '}
                {t('transactions.title').toLowerCase()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                {t('transactions.net')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  totalIncome - totalExpense >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }
;`}
              >
                {formatCurrency(totalIncome - totalExpense)}
              </div>
              <p className="text-xs text-muted-foreground">
                {transactions?.length ?? 0}{' '}
                {t('transactions.title').toLowerCase()}
              </p>
            </CardContent>
          </Card>
        </div>
        {/* Filters */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-2">
            <Button
              variant={filter === 'ALL' ? 'default' : 'outline'}
              onClick={() => setFilter('ALL')}
            >
              {allFilterLabel}
            </Button>
            <Button
              variant={filter === 'INCOME' ? 'default' : 'outline'}
              onClick={() => setFilter('INCOME')}
            >
              {incomeFilterLabel}
            </Button>
            <Button
              variant={filter === 'EXPENSE' ? 'default' : 'outline'}
              onClick={() => setFilter('EXPENSE')}
            >
              {expenseFilterLabel}
            </Button>
            <Button
              variant={filter === 'TRANSFER' ? 'default' : 'outline'}
              onClick={() => setFilter('TRANSFER')}
            >
              {transferFilterLabel}
            </Button>
          </div>
          <Select
            value={budgetFilter}
            onValueChange={setBudgetFilter}
          >
            <SelectTrigger className="w-full md:w-56">
              <SelectValue placeholder={t('forms.selectBudget')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_BUDGETS_VALUE}>
                {t('transactions.all')}
              </SelectItem>
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
        </div>
        {/* Transactions list */}
        {visibleTransactions.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>{t('transactions.noTransactions')}</CardTitle>
              <CardDescription>{t('transactions.getStarted')}</CardDescription>
            </CardHeader>
            <CardContent>
              <CreateTransactionButton
                budgetId={budgetId}
                preSelectedBillId={createFromBill}
                variant="default"
              >
                {/* We can't actually change text this way with current component,
                  but the standard button text is fine or we can add a text props if needed,
                  for now using default text "Add Transaction" is acceptable */}
              </CreateTransactionButton>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.date')}</TableHead>
                  <TableHead>{t('common.name')}</TableHead>
                  <TableHead>{t('forms.transactionType')}</TableHead>
                  <TableHead>{t('transactions.status')}</TableHead>
                  <TableHead>{t('common.category')}</TableHead>
                  <TableHead>{t('common.account')}</TableHead>
                  <TableHead className="text-right">
                    {t('common.amount')}
                  </TableHead>
                  <TableHead className="text-right">
                    {t('common.actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleTransactions.map((transaction) => {
                  const type = getTransactionType(transaction)
                  const hasSplits =
                    'splits' in transaction &&
                    transaction.splits &&
                    transaction.splits.length > 0

                  return (
                    <TableRow
                      key={transaction.id}
                      className={
                        transaction.status === TransactionStatus.PENDING
                          ? 'opacity-60'
                          : undefined
                      }
                    >
                      <TableCell>{format(transaction.date, 'PP')}</TableCell>
                      <TableCell className="font-medium">
                        {transaction.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getTransactionTypeBadgeVariant(type)}>
                          {getTransactionTypeLabel(type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getTransactionStatusBadgeClass(
                            transaction.status
                          )}
                        >
                          {t(
                            `transactions.transactionStatus.${transaction.status.toLowerCase()}`
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {type === 'TRANSFER' ? (
                          <span className="text-sm text-muted-foreground">
                            {transaction.account?.name ?? '-'} {'->'}{' '}
                            {transaction.transferToAccount?.name ?? '-'}
                          </span>
                        ) : hasSplits ? (
                          <Badge variant="outline">
                            {transaction.splits?.length ?? 0}{' '}
                            {t('common.splits')}
                          </Badge>
                        ) : (
                          <Badge
                            variant={
                              type === 'INCOME' ? 'default' : 'secondary'
                            }
                          >
                            {transaction.category?.name ||
                              t('common.uncategorized')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {type === 'TRANSFER'
                          ? `${transaction.account?.name ?? '-'} -> ${
                              transaction.transferToAccount?.name ?? '-'
                            }`
                          : (transaction.account?.name ?? '-')}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          type === 'INCOME'
                            ? 'text-green-600'
                            : type === 'TRANSFER'
                              ? 'text-foreground'
                              : 'text-red-600'
                        }`}
                      >
                        {type === 'INCOME'
                          ? '+'
                          : type === 'EXPENSE'
                            ? '-'
                            : ''}
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                            >
                              <MoreVerticalIcon className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {type === 'TRANSFER' ? (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleEditTransfer({
                                      id: transaction.id,
                                      name: transaction.name,
                                      budgetId: transaction.budget?.id,
                                      amount: transaction.amount,
                                      date: transaction.date,
                                      notes: transaction.notes ?? null,
                                      fromAccountId: transaction.account.id,
                                      toAccountId:
                                        transaction.transferToAccount?.id
                                    })
                                  }
                                >
                                  <PencilIcon className="mr-2 h-4 w-4" />
                                  {t('transfers.edit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    confirm({
                                      description: t('transfers.deleteConfirm'),
                                      confirmText: t('common.delete')
                                    }).then((isConfirmed) => {
                                      if (!isConfirmed) return
                                      deleteTransaction({
                                        id: transaction.id,
                                        userId
                                      })
                                    })
                                  }}
                                  className="text-red-600"
                                >
                                  <TrashIcon className="mr-2 h-4 w-4" />
                                  {t('common.delete')} {t('common.transfer')}
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleEditTransaction(transaction)
                                  }
                                >
                                  <PencilIcon className="mr-2 h-4 w-4" />
                                  {t('common.edit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    confirm({
                                      description: t(
                                        'transactions.cloneConfirm',
                                        {
                                          name: transaction.name
                                        }
                                      ),
                                      confirmText: t('common.clone')
                                    }).then((isConfirmed) => {
                                      if (!isConfirmed) return
                                      cloneTransaction({
                                        id: transaction.id,
                                        userId
                                      })
                                    })
                                  }}
                                >
                                  <CopyIcon className="mr-2 h-4 w-4" />
                                  {t('common.clone')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => {
                                    confirm({
                                      description: t(
                                        'transactions.deleteConfirm',
                                        {
                                          name: transaction.name
                                        }
                                      ),
                                      confirmText: t('common.delete')
                                    }).then((isConfirmed) => {
                                      if (!isConfirmed) return
                                      deleteTransaction({
                                        id: transaction.id,
                                        userId
                                      })
                                    })
                                  }}
                                >
                                  <TrashIcon className="mr-2 h-4 w-4" />
                                  {t('common.delete')}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
      {confirmDialog}
    </>
  )
}
