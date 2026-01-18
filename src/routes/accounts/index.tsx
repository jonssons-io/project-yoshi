/**
 * Accounts page - Manage financial accounts
 */

import { createFileRoute, Link } from '@tanstack/react-router'
import { useUser } from '@clerk/clerk-react'
import { useTRPC } from '@/integrations/trpc/react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useSelectedHousehold } from '@/hooks/use-selected-household'
import { AccountForm } from '@/components/accounts/AccountForm'
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
import { useState } from 'react'
import { PlusIcon, TrashIcon, PencilIcon } from 'lucide-react'
import { z } from 'zod'

export const Route = createFileRoute('/accounts/')({
  component: AccountsPage,
})

// TODO: Remove this once Clerk is properly configured
const MOCK_USER_ID = 'demo-user-123'

// Component for each account row (to handle hooks properly)
function AccountRow({
  account,
  userId,
  onEdit,
  onDelete,
  formatCurrency,
}: {
  account: {
    id: string
    name: string
    externalIdentifier: string | null
    initialBalance: number
    _count: { transactions: number }
  }
  userId: string
  onEdit: (account: {
    id: string
    name: string
    externalIdentifier: string | null
    initialBalance: number
  }) => void
  onDelete: (data: { id: string; userId: string }) => void
  formatCurrency: (amount: number) => string
}) {
  const trpc = useTRPC()

  const { data: balance } = useQuery({
    ...trpc.accounts.getBalance.queryOptions({
      id: account.id,
      userId,
    }),
    enabled: true,
  })

  return (
    <TableRow>
      <TableCell className="font-medium">{account.name}</TableCell>
      <TableCell className="text-muted-foreground">
        {account.externalIdentifier || '—'}
      </TableCell>
      <TableCell className="text-right">
        {formatCurrency(account.initialBalance)}
      </TableCell>
      <TableCell className="text-right font-medium">
        {balance ? formatCurrency(balance.currentBalance) : '...'}
      </TableCell>
      <TableCell>{account._count.transactions}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              onEdit({
                id: account.id,
                name: account.name,
                externalIdentifier: account.externalIdentifier,
                initialBalance: account.initialBalance,
              })
            }
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (account._count.transactions > 0) {
                alert(
                  `Cannot delete "${account.name}" because it has ${account._count.transactions} transaction(s). Please reassign or delete those transactions first.`,
                )
                return
              }
              if (confirm(`Are you sure you want to delete "${account.name}"?`)) {
                onDelete({
                  id: account.id,
                  userId,
                })
              }
            }}
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function AccountsPage() {
  const { user } = useUser()
  const { selectedHouseholdId } = useSelectedHousehold()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)

  const trpc = useTRPC()
  const userId = user?.id ?? MOCK_USER_ID

  // Fetch full account details when editing (including budget links)
  const { data: editingAccount } = useQuery({
    ...trpc.accounts.getById.queryOptions({
      id: editingAccountId!,
      userId,
    }),
    enabled: !!editingAccountId,
  })

  const { data: accounts, isLoading, refetch } = useQuery({
    ...trpc.accounts.list.queryOptions({
      householdId: selectedHouseholdId!,
      userId,
    }),
    enabled: !!selectedHouseholdId,
  })

  // Fetch budgets for linking when creating accounts
  const { data: budgets } = useQuery({
    ...trpc.budgets.list.queryOptions({
      householdId: selectedHouseholdId!,
      userId,
    }),
    enabled: !!selectedHouseholdId,
  })

  const { mutate: createAccount } = useMutation({
    ...trpc.accounts.create.mutationOptions(),
    onSuccess: () => {
      refetch()
      setCreateDialogOpen(false)
    },
  })

  const { mutate: updateAccount } = useMutation({
    ...trpc.accounts.update.mutationOptions(),
    onSuccess: () => {
      refetch()
      setEditingAccountId(null)
    },
  })

  const { mutate: deleteAccount } = useMutation({
    ...trpc.accounts.delete.mutationOptions(),
    onSuccess: () => {
      refetch()
    },
    onError: (error) => {
      alert(error instanceof Error ? error.message : 'Failed to delete account')
    },
  })

  if (!selectedHouseholdId) {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle>No Household Selected</CardTitle>
            <CardDescription>
              Please select or create a household first to manage accounts
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
          <p className="text-muted-foreground">Loading accounts...</p>
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

  return (
    <div className="container py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Accounts</h1>
            <p className="text-muted-foreground">
              Manage your financial accounts
            </p>
          </div>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="mr-2 h-4 w-4" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Account</DialogTitle>
                <DialogDescription>
                  Add a new financial account to track
                </DialogDescription>
              </DialogHeader>
              <AccountForm
                onSubmit={async (data) => {
                  createAccount({
                    ...data,
                    householdId: selectedHouseholdId!,
                    userId,
                  })
                }}
                onCancel={() => setCreateDialogOpen(false)}
                submitLabel="Create Account"
                budgets={budgets ?? []}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {accounts?.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No accounts yet</CardTitle>
            <CardDescription>
              Get started by creating your first account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Create Your First Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>External ID</TableHead>
                <TableHead className="text-right">Initial Balance</TableHead>
                <TableHead className="text-right">Current Balance</TableHead>
                <TableHead>Transactions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts?.map((account) => (
                <AccountRow
                  key={account.id}
                  account={account}
                  userId={userId}
                  onEdit={(acc) => setEditingAccountId(acc.id)}
                  onDelete={deleteAccount}
                  formatCurrency={formatCurrency}
                />
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Edit Account Dialog */}
      <Dialog
        open={!!editingAccountId}
        onOpenChange={(open) => !open && setEditingAccountId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
            <DialogDescription>Update account information and budget access</DialogDescription>
          </DialogHeader>
          {editingAccount && (
            <AccountForm
              defaultValues={{
                name: editingAccount.name,
                externalIdentifier: editingAccount.externalIdentifier ?? '',
                initialBalance: editingAccount.initialBalance,
                budgetIds: editingAccount.budgets.map(b => b.budgetId),
              }}
              onSubmit={async (data) => {
                updateAccount({
                  id: editingAccount.id,
                  userId,
                  ...data,
                })
              }}
              onCancel={() => setEditingAccountId(null)}
              submitLabel="Update Account"
              budgets={budgets ?? []}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
