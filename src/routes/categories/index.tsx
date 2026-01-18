/**
 * Categories page - Manage income and expense categories
 */

import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useUser } from '@clerk/clerk-react'
import { useTRPC } from '@/integrations/trpc/react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { CategoryForm } from '@/components/categories/CategoryForm'
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
import { useState } from 'react'
import { PlusIcon, TrashIcon, PencilIcon, ArrowLeftIcon } from 'lucide-react'
import { z } from 'zod'

// Search params schema
const categoriesSearchSchema = z.object({
  budgetId: z.string().optional(),
})

export const Route = createFileRoute('/categories/')({
  component: CategoriesPage,
  validateSearch: (search) => categoriesSearchSchema.parse(search),
})

// TODO: Remove this once Clerk is properly configured
const MOCK_USER_ID = 'demo-user-123'

function CategoriesPage() {
  const { budgetId } = Route.useSearch()
  const navigate = useNavigate()
  const { user } = useUser()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<{
    id: string
    name: string
    type: 'INCOME' | 'EXPENSE'
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
              Please select a budget to manage categories
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

  const { data: categories, isLoading, refetch } = useQuery({
    ...trpc.categories.list.queryOptions({
      budgetId,
      userId,
      type: filter === 'ALL' ? undefined : filter,
    }),
    enabled: true,
  })

  const { mutate: createCategory } = useMutation({
    ...trpc.categories.create.mutationOptions(),
    onSuccess: () => {
      refetch()
      setCreateDialogOpen(false)
    },
  })

  const { mutate: updateCategory } = useMutation({
    ...trpc.categories.update.mutationOptions(),
    onSuccess: () => {
      refetch()
      setEditingCategory(null)
    },
  })

  const { mutate: deleteCategory } = useMutation({
    ...trpc.categories.delete.mutationOptions(),
    onSuccess: () => {
      refetch()
    },
    onError: (error) => {
      alert(error instanceof Error ? error.message : 'Failed to delete category')
    },
  })

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center">
          <p className="text-muted-foreground">Loading categories...</p>
        </div>
      </div>
    )
  }

  const incomeCount = categories?.filter((c) => c.type === 'INCOME').length ?? 0
  const expenseCount = categories?.filter((c) => c.type === 'EXPENSE').length ?? 0

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
            <h1 className="text-3xl font-bold">Categories</h1>
            <p className="text-muted-foreground">
              Manage your income and expense categories
            </p>
          </div>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Category</DialogTitle>
                <DialogDescription>
                  Add a new income or expense category
                </DialogDescription>
              </DialogHeader>
              <CategoryForm
                onSubmit={async (data) => {
                  createCategory({
                    ...data,
                    budgetId,
                    userId,
                  })
                }}
                onCancel={() => setCreateDialogOpen(false)}
                submitLabel="Create Category"
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mb-6 flex gap-2">
        <Button
          variant={filter === 'ALL' ? 'default' : 'outline'}
          onClick={() => setFilter('ALL')}
        >
          All ({categories?.length ?? 0})
        </Button>
        <Button
          variant={filter === 'INCOME' ? 'default' : 'outline'}
          onClick={() => setFilter('INCOME')}
        >
          Income ({incomeCount})
        </Button>
        <Button
          variant={filter === 'EXPENSE' ? 'default' : 'outline'}
          onClick={() => setFilter('EXPENSE')}
        >
          Expenses ({expenseCount})
        </Button>
      </div>

      {categories?.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No categories yet</CardTitle>
            <CardDescription>
              Get started by creating your first category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Create Your First Category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Transactions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories?.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        category.type === 'INCOME' ? 'default' : 'secondary'
                      }
                    >
                      {category.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{category._count.transactions}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setEditingCategory({
                            id: category.id,
                            name: category.name,
                            type: category.type,
                          })
                        }
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (category._count.transactions > 0) {
                            alert(
                              `Cannot delete "${category.name}" because it has ${category._count.transactions} transaction(s). Please reassign or delete those transactions first.`,
                            )
                            return
                          }
                          if (
                            confirm(
                              `Are you sure you want to delete "${category.name}"?`,
                            )
                          ) {
                            deleteCategory({
                              id: category.id,
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

      {/* Edit Category Dialog */}
      <Dialog
        open={!!editingCategory}
        onOpenChange={(open) => !open && setEditingCategory(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update category information</DialogDescription>
          </DialogHeader>
          {editingCategory && (
            <CategoryForm
              defaultValues={{
                name: editingCategory.name,
                type: editingCategory.type,
              }}
              onSubmit={async (data) => {
                updateCategory({
                  id: editingCategory.id,
                  userId,
                  ...data,
                })
              }}
              onCancel={() => setEditingCategory(null)}
              submitLabel="Update Category"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
