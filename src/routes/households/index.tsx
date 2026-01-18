/**
 * Households page - Manage households
 */

import { createFileRoute, Link } from '@tanstack/react-router'
import { useUser } from '@clerk/clerk-react'
import { useTRPC } from '@/integrations/trpc/react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useSelectedHousehold } from '@/hooks/use-selected-household'
import { HouseholdForm } from '@/components/households/HouseholdForm'
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
import { PlusIcon, TrashIcon, PencilIcon, Building2 } from 'lucide-react'

export const Route = createFileRoute('/households/')({
  component: HouseholdsPage,
})

// TODO: Remove this once Clerk is properly configured
const MOCK_USER_ID = 'demo-user-123'

function HouseholdsPage() {
  const { user } = useUser()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingHousehold, setEditingHousehold] = useState<{
    id: string
    name: string
  } | null>(null)

  const trpc = useTRPC()
  const userId = user?.id ?? MOCK_USER_ID
  const { setSelectedHousehold } = useSelectedHousehold()

  const { data: households, isLoading, refetch } = useQuery({
    ...trpc.households.list.queryOptions({ userId }),
    enabled: true,
  })

  const { mutate: createHousehold } = useMutation({
    ...trpc.households.create.mutationOptions(),
    onSuccess: (data) => {
      refetch()
      setCreateDialogOpen(false)
      // Auto-select the newly created household
      setSelectedHousehold(data.id)
    },
  })

  const { mutate: updateHousehold } = useMutation({
    ...trpc.households.update.mutationOptions(),
    onSuccess: () => {
      refetch()
      setEditingHousehold(null)
    },
  })

  const { mutate: deleteHousehold } = useMutation({
    ...trpc.households.delete.mutationOptions(),
    onSuccess: () => {
      refetch()
    },
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Households</h1>
            <p className="text-muted-foreground">Manage your households</p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="mr-2 h-4 w-4" />
                New Household
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Household</DialogTitle>
                <DialogDescription>
                  Add a new household to organize your finances
                </DialogDescription>
              </DialogHeader>
              <HouseholdForm
                onSubmit={async (data) => {
                  createHousehold({
                    ...data,
                    userId,
                  })
                }}
                onCancel={() => setCreateDialogOpen(false)}
                submitLabel="Create Household"
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {households?.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No households yet</CardTitle>
            <CardDescription>
              Get started by creating your first household
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Create Your First Household
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Budgets</TableHead>
                <TableHead>Categories</TableHead>
                <TableHead>Accounts</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {households?.map((household) => (
                <TableRow key={household.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {household.name}
                    </div>
                  </TableCell>
                  <TableCell>{household._count?.users || 0}</TableCell>
                  <TableCell>{household._count?.budgets || 0}</TableCell>
                  <TableCell>{household._count?.categories || 0}</TableCell>
                  <TableCell>{household._count?.accounts || 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Dialog
                        open={editingHousehold?.id === household.id}
                        onOpenChange={(open) => {
                          if (!open) setEditingHousehold(null)
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setEditingHousehold({
                                id: household.id,
                                name: household.name,
                              })
                            }
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Household</DialogTitle>
                            <DialogDescription>
                              Update household information
                            </DialogDescription>
                          </DialogHeader>
                          {editingHousehold && (
                            <HouseholdForm
                              defaultValues={{
                                name: editingHousehold.name,
                              }}
                              onSubmit={async (data) => {
                                updateHousehold({
                                  id: editingHousehold.id,
                                  userId,
                                  ...data,
                                })
                              }}
                              onCancel={() => setEditingHousehold(null)}
                              submitLabel="Save Changes"
                            />
                          )}
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (household._count?.budgets > 0) {
                            alert(
                              `Cannot delete "${household.name}" because it has ${household._count.budgets} budget(s). Please delete those budgets first.`,
                            )
                            return
                          }
                          if (
                            confirm(
                              `Are you sure you want to delete "${household.name}"? This will delete all associated categories and accounts.`,
                            )
                          ) {
                            deleteHousehold({
                              id: household.id,
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
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
