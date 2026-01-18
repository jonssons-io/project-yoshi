/**
 * Budgets page - List and manage budgets
 */

import { createFileRoute, Link } from '@tanstack/react-router'
import { useUser } from '@clerk/clerk-react'
import { useTRPC } from '@/integrations/trpc/react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useSelectedHousehold } from '@/hooks/use-selected-household'
import { BudgetForm } from '@/components/budgets/BudgetForm'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { format } from 'date-fns'
import { useState } from 'react'
import { PlusIcon, TrashIcon, PencilIcon } from 'lucide-react'

export const Route = createFileRoute('/budgets/')({
  component: BudgetsPage,
})

// TODO: Remove this once Clerk is properly configured
const MOCK_USER_ID = 'demo-user-123'

function BudgetsPage() {
  const { user, isLoaded } = useUser()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<{
    id: string
    name: string
    startDate: Date
  } | null>(null)

  const trpc = useTRPC()
  const { selectedHouseholdId } = useSelectedHousehold()

  // Use Clerk user ID if available, otherwise use mock ID
  const userId = user?.id ?? MOCK_USER_ID
  const isAuthReady = isLoaded || !user

  const { data: budgets, isLoading, refetch, error, status, fetchStatus } = useQuery({
    ...trpc.budgets.list.queryOptions({
      householdId: selectedHouseholdId!,
      userId,
    }),
    enabled: isAuthReady && !!selectedHouseholdId,
  })

  // Debug logging
  console.log('Budget page state:', {
    isLoaded,
    userId,
    isAuthReady,
    isLoading,
    status,
    fetchStatus,
    budgetsCount: budgets?.length,
    error: error ? {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    } : null
  })

  const { mutate: createBudget } = useMutation({
    ...trpc.budgets.create.mutationOptions(),
    onSuccess: () => {
      refetch()
      setCreateDialogOpen(false)
    },
  })

  const { mutate: updateBudget } = useMutation({
    ...trpc.budgets.update.mutationOptions(),
    onSuccess: () => {
      refetch()
      setEditingBudget(null)
    },
  })

  const { mutate: deleteBudget } = useMutation({
    ...trpc.budgets.delete.mutationOptions(),
    onSuccess: () => {
      refetch()
    },
  })

  if (!isAuthReady) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center">
          <p className="text-muted-foreground">Loading user...</p>
        </div>
      </div>
    )
  }

  if (!selectedHouseholdId) {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle>No Household Selected</CardTitle>
            <CardDescription>
              Please select or create a household first to manage budgets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/households">Go to Households</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center">
          <p className="text-muted-foreground">Loading budgets...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle>Error Loading Budgets</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : 'An error occurred'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Budgets</h1>
          <p className="text-muted-foreground">
            Create and manage your household budgets
          </p>
          {!user && (
            <p className="text-sm text-amber-600 mt-2">
              Demo mode - Sign in with Clerk for multi-user support
            </p>
          )}
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              Create Budget
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Budget</DialogTitle>
              <DialogDescription>
                Create a new budget to track your income and expenses
              </DialogDescription>
            </DialogHeader>
            <BudgetForm
              onSubmit={async (data) => {
                createBudget({
                  ...data,
                  householdId: selectedHouseholdId!,
                  userId,
                })
              }}
              onCancel={() => setCreateDialogOpen(false)}
              submitLabel="Create Budget"
            />
          </DialogContent>
        </Dialog>
      </div>

      {budgets?.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No budgets yet</CardTitle>
            <CardDescription>
              Get started by creating your first budget
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Create Your First Budget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {budgets?.map((budget) => (
            <Card key={budget.id}>
              <CardHeader>
                <CardTitle>{budget.name}</CardTitle>
                <CardDescription>
                  Started {format(new Date(budget.startDate), 'PP')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Categories:</span>
                    <span className="font-medium">
                      {budget._count.categories}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Accounts:</span>
                    <span className="font-medium">{budget._count.accounts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transactions:</span>
                    <span className="font-medium">
                      {budget._count.transactions}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button asChild variant="outline" className="flex-1">
                  <Link to="/budgets/$budgetId" params={{ budgetId: budget.id }}>
                    View Details
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setEditingBudget({
                      id: budget.id,
                      name: budget.name,
                      startDate: new Date(budget.startDate),
                    })
                  }
                >
                  <PencilIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (
                      confirm(
                        `Are you sure you want to delete "${budget.name}"? This will delete all associated categories, accounts, and transactions.`,
                      )
                    ) {
                      deleteBudget({
                        id: budget.id,
                        userId,
                      })
                    }
                  }}
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Budget Dialog */}
      <Dialog
        open={!!editingBudget}
        onOpenChange={(open) => !open && setEditingBudget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Budget</DialogTitle>
            <DialogDescription>
              Update your budget information
            </DialogDescription>
          </DialogHeader>
          {editingBudget && (
            <BudgetForm
              defaultValues={{
                name: editingBudget.name,
                startDate: editingBudget.startDate,
              }}
              onSubmit={async (data) => {
                updateBudget({
                  id: editingBudget.id,
                  userId,
                  ...data,
                })
              }}
              onCancel={() => setEditingBudget(null)}
              submitLabel="Update Budget"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
