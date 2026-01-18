/**
 * Bills Page - List and manage bills
 */

import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useUser } from '@clerk/clerk-react'
import { useTRPC } from '@/integrations/trpc/react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useSelectedBudget } from '@/hooks/use-selected-budget'
import { useSelectedHousehold } from '@/hooks/use-selected-household'
import { Button } from '@/components/ui/button'
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useState } from 'react'
import { PlusIcon, MoreVerticalIcon, ArchiveIcon, TrashIcon, Edit2Icon, ReceiptIcon } from 'lucide-react'
import { format } from 'date-fns'
import { BillForm, type BillFormData } from '@/components/bills/BillForm'
import { Badge } from '@/components/ui/badge'
import { RecurrenceType } from '@/generated/prisma/enums'
import { z } from 'zod'

// Search params schema
const billsSearchSchema = z.object({
  budgetId: z.string().optional(),
})

export const Route = createFileRoute('/bills/')({
  component: BillsPage,
  validateSearch: (search) => billsSearchSchema.parse(search),
})

// TODO: Remove this once Clerk is properly configured
const MOCK_USER_ID = 'demo-user-123'

function BillsPage() {
  const { budgetId: urlBudgetId } = Route.useSearch()
  const { selectedBudgetId } = useSelectedBudget()
  const { selectedHouseholdId } = useSelectedHousehold()
  const budgetId = urlBudgetId || selectedBudgetId
  const { user } = useUser()
  const userId = user?.id ?? MOCK_USER_ID
  const trpc = useTRPC()
  const navigate = useNavigate()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingBill, setEditingBill] = useState<any>(null)
  const [thisMonthOnly, setThisMonthOnly] = useState(false)
  const [includeArchived, setIncludeArchived] = useState(false)

  // If no budgetId, show message to select one
  if (!budgetId) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Card>
          <CardHeader>
            <CardTitle>No Budget Selected</CardTitle>
            <CardDescription>
              Please select a budget to manage bills
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

  // Fetch bills
  const billsQuery = useQuery(
    trpc.bills.list.queryOptions({
      budgetId,
      userId,
      thisMonthOnly,
      includeArchived,
    }),
  )

  // Fetch accounts for form
  const accountsQuery = useQuery({
    ...trpc.accounts.list.queryOptions({
      householdId: selectedHouseholdId!,
      userId,
      budgetId: budgetId, // Filter by budget-linked accounts only
    }),
    enabled: !!selectedHouseholdId && !!budgetId,
  })

  // Fetch categories for form (expense categories only)
  const categoriesQuery = useQuery({
    ...trpc.categories.list.queryOptions({
      householdId: selectedHouseholdId!,
      userId,
      type: 'EXPENSE',
      budgetId: budgetId, // Filter by budget-linked categories only
    }),
    enabled: !!selectedHouseholdId && !!budgetId,
  })

  // Categories are already filtered for EXPENSE type in the query
  const expenseCategories = categoriesQuery.data ?? []

  // Create mutation
  const createMutation = useMutation(
    trpc.bills.create.mutationOptions({
      onSuccess: () => {
        billsQuery.refetch()
        setCreateDialogOpen(false)
      },
    }),
  )

  // Update mutation
  const updateMutation = useMutation(
    trpc.bills.update.mutationOptions({
      onSuccess: () => {
        billsQuery.refetch()
        setEditDialogOpen(false)
        setEditingBill(null)
      },
    }),
  )

  // Delete mutation
  const deleteMutation = useMutation(
    trpc.bills.delete.mutationOptions({
      onSuccess: () => {
        billsQuery.refetch()
      },
    }),
  )

  // Archive mutation
  const archiveMutation = useMutation(
    trpc.bills.archive.mutationOptions({
      onSuccess: () => {
        billsQuery.refetch()
      },
    }),
  )

  const handleCreate = (data: BillFormData) => {
    createMutation.mutate({
      ...data,
      budgetId,
      userId,
      lastPaymentDate: data.lastPaymentDate || undefined,
    })
  }

  const handleUpdate = (data: BillFormData) => {
    if (!editingBill) return
    updateMutation.mutate({
      id: editingBill.id,
      userId,
      ...data,
    })
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this bill?')) {
      deleteMutation.mutate({ id, userId })
    }
  }

  const handleArchive = (id: string, archived: boolean) => {
    archiveMutation.mutate({ id, archived, userId })
  }

  const handleCreateTransaction = (bill: any) => {
    // Navigate to transactions page with pre-filled data
    navigate({
      to: '/transactions',
      search: {
        budgetId,
        createFromBill: bill.id,
      },
    })
  }

  const getRecurrenceLabel = (type: RecurrenceType, customDays?: number | null) => {
    switch (type) {
      case RecurrenceType.NONE:
        return 'One-time'
      case RecurrenceType.WEEKLY:
        return 'Weekly'
      case RecurrenceType.MONTHLY:
        return 'Monthly'
      case RecurrenceType.QUARTERLY:
        return 'Quarterly'
      case RecurrenceType.YEARLY:
        return 'Yearly'
      case RecurrenceType.CUSTOM:
        return `Every ${customDays} days`
      default:
        return type
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bills</h1>
          <p className="text-muted-foreground">Manage your recurring and one-time bills</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          New Bill
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          variant={thisMonthOnly ? 'default' : 'outline'}
          onClick={() => setThisMonthOnly(!thisMonthOnly)}
          size="sm"
        >
          This Month
        </Button>
        <Button
          variant={includeArchived ? 'default' : 'outline'}
          onClick={() => setIncludeArchived(!includeArchived)}
          size="sm"
        >
          {includeArchived ? 'Hide Archived' : 'Show Archived'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Bills</CardTitle>
          <CardDescription>
            {billsQuery.data?.length ?? 0} bill{billsQuery.data?.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {billsQuery.isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading bills...</div>
          ) : billsQuery.data?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No bills found. Create your first bill to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Recurrence</TableHead>
                  <TableHead>Next Occurrence</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billsQuery.data?.map((bill) => (
                  <TableRow key={bill.id} className={bill.isArchived ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">
                      {bill.name}
                      {bill.isArchived && (
                        <Badge variant="secondary" className="ml-2">
                          Archived
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{bill.recipient}</TableCell>
                    <TableCell>{bill.account.name}</TableCell>
                    <TableCell>${bill.estimatedAmount.toFixed(2)}</TableCell>
                    <TableCell>
                      {getRecurrenceLabel(bill.recurrenceType, bill.customIntervalDays)}
                    </TableCell>
                    <TableCell>
                      {bill.nextOccurrence ? (
                        bill.hasScheduledTransaction ? (
                          <Badge variant="default">Transaction Scheduled</Badge>
                        ) : (
                          format(new Date(bill.nextOccurrence), 'MMM d, yyyy')
                        )
                      ) : (
                        <span className="text-muted-foreground">Completed</span>
                      )}
                    </TableCell>
                    <TableCell>{bill.category.name}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVerticalIcon className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!bill.hasScheduledTransaction && bill.nextOccurrence && (
                            <>
                              <DropdownMenuItem onClick={() => handleCreateTransaction(bill)}>
                                <ReceiptIcon className="h-4 w-4 mr-2" />
                                Create Transaction
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingBill(bill)
                              setEditDialogOpen(true)
                            }}
                          >
                            <Edit2Icon className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleArchive(bill.id, !bill.isArchived)}
                          >
                            <ArchiveIcon className="h-4 w-4 mr-2" />
                            {bill.isArchived ? 'Unarchive' : 'Archive'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(bill.id)}
                            className="text-destructive"
                          >
                            <TrashIcon className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Bill</DialogTitle>
            <DialogDescription>
              Add a new bill to track recurring or one-time payments
            </DialogDescription>
          </DialogHeader>
          {accountsQuery.data && categoriesQuery.data && (
            <BillForm
              onSubmit={handleCreate}
              onCancel={() => setCreateDialogOpen(false)}
              accounts={accountsQuery.data}
              categories={expenseCategories}
              isSubmitting={createMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Bill</DialogTitle>
            <DialogDescription>Update bill information</DialogDescription>
          </DialogHeader>
          {editingBill && accountsQuery.data && categoriesQuery.data && (
            <BillForm
              initialData={{
                name: editingBill.name,
                recipient: editingBill.recipient,
                accountId: editingBill.accountId,
                startDate: new Date(editingBill.startDate),
                recurrenceType: editingBill.recurrenceType,
                customIntervalDays: editingBill.customIntervalDays,
                estimatedAmount: editingBill.estimatedAmount,
                lastPaymentDate: editingBill.lastPaymentDate
                  ? new Date(editingBill.lastPaymentDate)
                  : null,
                categoryId: editingBill.categoryId,
              }}
              onSubmit={handleUpdate}
              onCancel={() => {
                setEditDialogOpen(false)
                setEditingBill(null)
              }}
              accounts={accountsQuery.data}
              categories={expenseCategories}
              isSubmitting={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
