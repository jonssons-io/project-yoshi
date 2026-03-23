/**
 * Categories page - Manage income and expense categories
 */

import { createFileRoute } from '@tanstack/react-router'
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { BaseButton } from '@/components/base-button/base-button'
import { Button } from '@/components/button/button'
import { CategoryForm } from '@/components/categories/CategoryForm'
import { SetupPrompt } from '@/components/dashboard/SetupPrompt'
import { IconButton } from '@/components/icon-button/icon-button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
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
  useArchiveCategory,
  useBudgetsList,
  useCategoriesList,
  useCategoryById,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory
} from '@/hooks/api'
import { useConfirmDialog } from '@/hooks/use-confirm-dialog'
import { useDrawer } from '@/hooks/use-drawer'
import { getErrorMessage } from '@/lib/api-error'

export const Route = createFileRoute('/_authenticated/categories/')({
  component: CategoriesPage
})

function CategoriesPage() {
  const { t } = useTranslation()
  const { userId, householdId } = useAuth()
  const { isOpen, openDrawer, closeDrawer } = useDrawer()
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null
  )
  const [filter, setFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL')
  const wasDrawerOpenRef = useRef(isOpen)
  const { confirm, confirmDialog } = useConfirmDialog()

  // Fetch full category details when editing (including budget links)
  const { data: editingCategory, isFetching: isEditingCategoryFetching } =
    useCategoryById({
      categoryId: editingCategoryId,
      userId,
      enabled: !!editingCategoryId
    })

  const { data: categories, refetch } = useCategoriesList({
    householdId,
    userId,
    type: filter === 'ALL' ? undefined : filter
  })

  // Fetch budgets for linking when creating categories
  const { data: budgets } = useBudgetsList({
    householdId,
    userId
  })

  const { mutate: createCategory } = useCreateCategory({
    onSuccess: () => {
      refetch()
      closeDrawer()
      toast.success(t('categories.createSuccess'))
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    }
  })

  const { mutate: updateCategory } = useUpdateCategory({
    onSuccess: () => {
      refetch()
      closeDrawer()
      setEditingCategoryId(null)
      toast.success(t('categories.updateSuccess'))
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    }
  })

  const { mutateAsync: deleteCategory } = useDeleteCategory({
    onSuccess: () => {
      refetch()
      toast.success(t('categories.deleteSuccess'))
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    }
  })

  const { mutate: archiveCategory } = useArchiveCategory({
    onSuccess: (_data, variables) => {
      refetch()
      toast.success(
        variables.archived
          ? t('categories.archiveSuccess')
          : t('categories.unarchiveSuccess')
      )
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    }
  })

  const handleDeleteCategory = async (category: {
    id: string
    name: string
    _count?: {
      transactions?: number
    }
  }) => {
    const transactionCount = category._count?.transactions ?? 0
    if (transactionCount > 0) {
      toast.error(
        t('categories.deleteBlocked', {
          name: category.name,
          count: transactionCount
        })
      )
      return
    }

    const isConfirmed = await confirm({
      description: t('categories.deleteConfirm', {
        name: category.name
      }),
      confirmText: t('common.delete')
    })
    if (!isConfirmed) return

    await deleteCategory({
      id: category.id,
      userId
    })
  }

  type CategoryWithBudgets = {
    budgets?: Array<{
      id?: string
      budgetId?: string
    }>
  }

  type BudgetWithCategories = {
    id: string
    categories?: Array<{
      categoryId?: string
    }>
  }

  const handleCreate = () => {
    openDrawer(
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">{t('categories.create')}</h2>
        <p className="text-muted-foreground mb-6">
          {t('categories.createDesc')}
        </p>
        <CategoryForm
          onSubmit={async (data) => {
            createCategory({
              ...data,
              householdId,
              userId
            })
          }}
          onCancel={closeDrawer}
          submitLabel={t('categories.createAction')}
          budgets={budgets ?? []}
        />
      </div>,
      t('categories.create')
    )
  }

  // Open drawer when editingCategoryId is set and data is loaded
  useEffect(() => {
    if (editingCategoryId && editingCategory && !isEditingCategoryFetching) {
      const categoryWithBudgets = editingCategory as CategoryWithBudgets
      const budgetsWithCategories = (budgets ?? []) as BudgetWithCategories[]

      const budgetIdsFromCategory = categoryWithBudgets.budgets
        ?.map((budget) => budget.id ?? budget.budgetId)
        .filter((budgetId): budgetId is string => !!budgetId)

      const budgetIdsFromBudgets =
        !budgetIdsFromCategory || budgetIdsFromCategory.length === 0
          ? budgetsWithCategories
              .filter((budget) =>
                budget.categories?.some(
                  (category) => category.categoryId === editingCategory.id
                )
              )
              .map((budget) => budget.id)
          : undefined
      const resolvedBudgetIds =
        budgetIdsFromCategory ?? budgetIdsFromBudgets ?? []

      openDrawer(
        <div className="p-4">
          <h2 className="text-2xl font-bold mb-4">{t('categories.edit')}</h2>
          <p className="text-muted-foreground mb-6">
            {t('categories.editDesc')}
          </p>
          <CategoryForm
            key={editingCategory.id}
            defaultValues={{
              name: editingCategory.name,
              types: editingCategory.types,
              budgetIds: resolvedBudgetIds
            }}
            onSubmit={async (data) => {
              updateCategory({
                id: editingCategory.id,
                userId,
                ...data
              })
            }}
            onCancel={() => {
              closeDrawer()
              setEditingCategoryId(null)
            }}
            submitLabel={t('categories.update')}
            budgets={budgets ?? []}
          />
        </div>,
        t('categories.edit')
      )
    }
  }, [
    editingCategoryId,
    editingCategory,
    isEditingCategoryFetching,
    openDrawer,
    closeDrawer,
    updateCategory,
    userId,
    budgets,
    t
  ])

  // Reset edit state whenever the drawer is dismissed externally (overlay, ESC, close button)
  useEffect(() => {
    if (wasDrawerOpenRef.current && !isOpen) {
      setEditingCategoryId(null)
    }
    wasDrawerOpenRef.current = isOpen
  }, [
    isOpen
  ])

  const incomeCount =
    categories?.filter((c) => c.types.includes('INCOME')).length ?? 0
  const expenseCount =
    categories?.filter((c) => c.types.includes('EXPENSE')).length ?? 0

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-end gap-2">
        <div className="flex gap-2">
          <Button
            variant={filter === 'ALL' ? 'filled' : 'outlined'}
            color={filter === 'ALL' ? 'primary' : 'subtle'}
            onClick={() => setFilter('ALL')}
            label={`${t('categories.all')} (${categories?.length ?? 0})`}
          />
          <Button
            variant={filter === 'INCOME' ? 'filled' : 'outlined'}
            color={filter === 'INCOME' ? 'primary' : 'subtle'}
            onClick={() => setFilter('INCOME')}
            label={`${t('categories.income')} (${incomeCount})`}
          />
          <Button
            variant={filter === 'EXPENSE' ? 'filled' : 'outlined'}
            color={filter === 'EXPENSE' ? 'primary' : 'subtle'}
            onClick={() => setFilter('EXPENSE')}
            label={`${t('categories.expense')} (${expenseCount})`}
          />
        </div>

        <Button
          onClick={handleCreate}
          icon={<PlusIcon />}
          label={t('categories.add')}
        />
      </div>

      {categories?.length === 0 ? (
        <SetupPrompt
          variant="no-category"
          onAction={handleCreate}
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.name')}</TableHead>
                <TableHead>{t('categories.type')}</TableHead>
                <TableHead>{t('categories.transactions')}</TableHead>
                <TableHead className="text-right">
                  {t('common.actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories?.map((category) => (
                <TableRow
                  key={category.id}
                  className={category.archived ? 'opacity-50 bg-muted/50' : ''}
                >
                  <TableCell className="font-medium">
                    {category.name}
                    {category.archived && (
                      <Badge
                        variant="secondary"
                        className="ml-2"
                      >
                        {t('common.archived')}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {category.types
                        .map(
                          (t) =>
                            t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
                        )
                        .join(' & ')}
                    </Badge>
                  </TableCell>
                  <TableCell>{category._count?.transactions ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <IconButton
                        variant="text"
                        color="subtle"
                        icon={<PencilIcon />}
                        onClick={() => setEditingCategoryId(category.id)}
                      />
                      <IconButton
                        variant="text"
                        color="subtle"
                        icon={
                          category.archived ? (
                            <ArchiveRestoreIcon className="h-4 w-4" />
                          ) : (
                            <ArchiveIcon className="h-4 w-4" />
                          )
                        }
                        onClick={() =>
                          archiveCategory({
                            id: category.id,
                            archived: !category.archived,
                            userId
                          })
                        }
                        title={
                          category.archived
                            ? t('common.unarchive')
                            : t('common.archive')
                        }
                      />
                      <BaseButton
                        variant="text"
                        color="subtle"
                        iconOnly
                        className={
                          (category._count?.transactions ?? 0) > 0
                            ? 'opacity-50'
                            : undefined
                        }
                        onClick={() => handleDeleteCategory(category)}
                        title={t('common.delete')}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </BaseButton>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      {confirmDialog}
    </div>
  )
}
