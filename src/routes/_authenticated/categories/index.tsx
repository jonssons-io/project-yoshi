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
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { BaseButton } from '@/components/base-button/base-button'
import { Button } from '@/components/button/button'
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
import { SetupPrompt } from '@/features/setup-prompt/setup-prompt'
import {
  useArchiveCategory,
  useCategoriesList,
  useDeleteCategory
} from '@/hooks/api'
import { useConfirmDialog } from '@/hooks/use-confirm-dialog'
import { getErrorMessage } from '@/lib/api-error'

export const Route = createFileRoute('/_authenticated/categories/')({
  component: CategoriesPage
})

function CategoriesPage() {
  const { t } = useTranslation()
  const { userId, householdId } = useAuth()
  const [filter, setFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL')
  const { confirm, confirmDialog } = useConfirmDialog()

  const { data: categories, refetch } = useCategoriesList({
    householdId,
    userId,
    type: filter === 'ALL' ? undefined : filter
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

  const handleCreate = () => {
    void 0
  }

  const incomeCount =
    categories?.filter((c) => c.types.includes('INCOME')).length ?? 0
  const expenseCount =
    categories?.filter((c) => c.types.includes('EXPENSE')).length ?? 0

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 space-y-6 overflow-auto px-4 pt-6 pb-6">
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
                    className={
                      category.archived ? 'opacity-50 bg-muted/50' : ''
                    }
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
                            (ty) =>
                              ty.charAt(0).toUpperCase() +
                              ty.slice(1).toLowerCase()
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
                          onClick={() => void 0}
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
      </div>
      {confirmDialog}
    </div>
  )
}
