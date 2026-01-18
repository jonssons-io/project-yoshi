/**
 * Transactions page - Manage income and expense transactions
 */

import { createFileRoute, Link } from '@tanstack/react-router'
import { useUser } from '@clerk/clerk-react'
import { useTRPC } from '@/integrations/trpc/react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useState } from 'react'
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  ArrowLeftIcon,
  MoreVerticalIcon,
  CopyIcon,
} from 'lucide-react'
import { format } from 'date-fns'
import { z } from 'zod'

// Search params schema
const transactionsSearchSchema = z.object({
  budgetId: z.string().optional(),
})

export const Route = createFileRoute('/transactions/')({
  component: TransactionsPage,
  validateSearch: (search) => transactionsSearchSchema.parse(search),
})

// TODO: Remove this once Clerk is properly configured
const MOCK_USER_ID = 'demo-user-123'

function TransactionsPage() {
  const { budgetId } = Route.useSearch()
  const { user } = useUser()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<{
    id: string
    name: string
    amount: number
    date: Date
    categoryId: string
    accountId: string
    notes: string | null
  } | null>(null)
  const [filter, setFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL')

  const trpc = useTRPC()
  const userId = user?.id ?? MOCK_USER_ID

  // If no budgetId, redirect to budgets page
  if (!budgetId) {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle>No Budget Selected</CardTitle>
            <CardDescription>
              Please select a budget to manage transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/budgets">Go to Budgets</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { data: transactions, isLoading, refetch } = useQuery({
    ...trpc.transactions.list.queryOptions({
      budgetId,
      userId,
      type: filter === 'ALL' ? undefined : filter,
    }),
    enabled: true,
  })

  const { data: categories } = useQuery({
    ...trpc.categories.list.queryOptions({
      budgetId,
      userId,
    }),
    enabled: true,
  })

  const { data: accounts } = useQuery({
    ...trpc.accounts.list.queryOptions({
      budgetId,
      userId,
    }),
    enabled: true,
  })

  const { mutate: createTransaction } = useMutation({
    ...trpc.transactions.create.mutationOptions(),
    onSuccess: () => {
      refetch()
      setCreateDialogOpen(false)
    },
  })

  const { mutate: updateTransaction } = useMutation({
    ...trpc.transactions.update.mutationOptions(),
    onSuccess: () => {
      refetch()
      setEditingTransaction(null)
    },
  })

  const { mutate: deleteTransaction } = useMutation({
    ...trpc.transactions.delete.mutationOptions(),
    onSuccess: () => {
      refetch()
    },
  })

  const { mutate: cloneTransaction } = useMutation({
    ...trpc.transactions.clone.mutationOptions(),
    onSuccess: () => {
      refetch()
    },
  })

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center">
          <p className="text-muted-foreground">Loading transactions...</p>
        </div>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const incomeTransactions = transactions?.filter(
    (t) => t.category.type === 'INCOME',
  )
  const expenseTransactions = transactions?.filter(
    (t) => t.category.type === 'EXPENSE',
  )
  const totalIncome =
    incomeTransactions?.reduce((sum, t) => sum + t.amount, 0) ?? 0
  const totalExpense =
    expenseTransactions?.reduce((sum, t) => sum + t.amount, 0) ?? 0

  return (
    <div className="container py-8">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/budgets/$budgetId" params={{ budgetId }}>
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to Budget
          </Link>
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Transactions</h1>
            <p className="text-muted-foreground">
              Track your income and expenses
            </p>
          </div>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="mr-2 h-4 w-4" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Transaction</DialogTitle>
                <DialogDescription>
                  Add a new income or expense transaction
                </DialogDescription>
              </DialogHeader>
              {categories && accounts && (
                <TransactionForm
                  categories={categories}
                  accounts={accounts}
                  onSubmit={async (data) => {
                    createTransaction({
                      ...data,
                      budgetId,
                      userId,
                    })
                  }}
                  onCancel={() => setCreateDialogOpen(false)}
                  submitLabel="Create Transaction"
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalIncome)}
            </div>
            <p className="text-xs text-muted-foreground">
              {incomeTransactions?.length ?? 0} transactions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalExpense)}
            </div>
            <p className="text-xs text-muted-foreground">
              {expenseTransactions?.length ?? 0} transactions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Net</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                totalIncome - totalExpense >= 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {formatCurrency(totalIncome - totalExpense)}
            </div>
            <p className="text-xs text-muted-foreground">
              {transactions?.length ?? 0} total transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter tabs */}
      <div className="mb-6 flex gap-2">
        <Button
          variant={filter === 'ALL' ? 'default' : 'outline'}
          onClick={() => setFilter('ALL')}
        >
          All ({transactions?.length ?? 0})
        </Button>
        <Button
          variant={filter === 'INCOME' ? 'default' : 'outline'}
          onClick={() => setFilter('INCOME')}
        >
          Income ({incomeTransactions?.length ?? 0})
        </Button>
        <Button
          variant={filter === 'EXPENSE' ? 'default' : 'outline'}
          onClick={() => setFilter('EXPENSE')}
        >
          Expenses ({expenseTransactions?.length ?? 0})
        </Button>
      </div>

      {transactions?.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No transactions yet</CardTitle>
            <CardDescription>
              Get started by creating your first transaction
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Create Your First Transaction
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions?.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    {format(new Date(transaction.date), 'PP')}
                  </TableCell>
                  <TableCell className="font-medium">
                    {transaction.name}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        transaction.category.type === 'INCOME'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {transaction.category.name}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {transaction.account.name}
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium ${
                      transaction.category.type === 'INCOME'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {transaction.category.type === 'INCOME' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVerticalIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            setEditingTransaction({
                              id: transaction.id,
                              name: transaction.name,
                              amount: transaction.amount,
                              date: new Date(transaction.date),
                              categoryId: transaction.categoryId,
                              accountId: transaction.accountId,
                              notes: transaction.notes,
                            })
                          }
                        >
                          <PencilIcon className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            if (
                              confirm(
                                `Clone transaction "${transaction.name}"?`,
                              )
                            ) {
                              cloneTransaction({
                                id: transaction.id,
                                userId,
                              })
                            }
                          }}
                        >
                          <CopyIcon className="mr-2 h-4 w-4" />
                          Clone
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => {
                            if (
                              confirm(
                                `Are you sure you want to delete "${transaction.name}"?`,
                              )
                            ) {
                              deleteTransaction({
                                id: transaction.id,
                                userId,
                              })
                            }
                          }}
                        >
                          <TrashIcon className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Edit Transaction Dialog */}
      <Dialog
        open={!!editingTransaction}
        onOpenChange={(open) => !open && setEditingTransaction(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>Update transaction information</DialogDescription>
          </DialogHeader>
          {editingTransaction && categories && accounts && (
            <TransactionForm
              defaultValues={{
                name: editingTransaction.name,
                amount: editingTransaction.amount,
                date: editingTransaction.date,
                categoryId: editingTransaction.categoryId,
                accountId: editingTransaction.accountId,
                notes: editingTransaction.notes ?? '',
              }}
              categories={categories}
              accounts={accounts}
              onSubmit={async (data) => {
                updateTransaction({
                  id: editingTransaction.id,
                  userId,
                  ...data,
                })
              }}
              onCancel={() => setEditingTransaction(null)}
              submitLabel="Update Transaction"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
