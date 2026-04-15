/**
 * Categories — list, filters, and per-budget category membership.
 */

import { createFileRoute } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { type ReactNode, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { CategoryType } from '@/api/generated/types.gen'
import { Badge } from '@/components/badge/badge'
import { DataTable, useDataTable } from '@/components/data-table'
import { PageLayout } from '@/components/page-layout/page-layout'
import { useAuth } from '@/contexts/auth-context'
import { useDrawer } from '@/drawers'
import { NoData } from '@/features/no-data/no-data'
import {
  useBudgetsList,
  useCategoriesByBudgetMap,
  useCategoriesList
} from '@/hooks/api'
import { useCategoryTableMutations } from '@/hooks/use-category-table-mutations'
import {
  type CategoryColumnLabelLookup,
  type CategoryTableRow,
  createCategoriesTableColumns
} from './-components/categories-table'
import { categoryBadgeColor } from './-components/category-badge-utils'

export const Route = createFileRoute('/_authenticated/categories/')({
  component: CategoriesPage
})

function CategoriesPage() {
  const { userId, householdId } = useAuth()
  const { t } = useTranslation()
  const { openDrawer } = useDrawer()

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    refetch: refetchCategories
  } = useCategoriesList({
    householdId,
    userId,
    enabled: !!householdId
  })

  const { data: budgets = [], isLoading: budgetsLoading } = useBudgetsList({
    householdId,
    userId,
    enabled: !!householdId
  })

  const activeBudgets = useMemo(
    () => budgets,
    [
      budgets
    ]
  )

  const budgetIds = useMemo(
    () => activeBudgets.map((b) => b.id),
    [
      activeBudgets
    ]
  )

  const categoriesByBudget = useCategoriesByBudgetMap({
    householdId,
    budgetIds,
    enabled: !!householdId && budgetIds.length > 0
  })

  const categoryToBudgets = useMemo(() => {
    const map = new Map<string, CategoryTableRow['linkedBudgets']>()
    for (const b of activeBudgets) {
      const cats = categoriesByBudget.byBudgetId.get(b.id) ?? []
      for (const c of cats) {
        const list = map.get(c.id) ?? []
        if (!list.some((x) => x.id === b.id)) {
          list.push({
            id: b.id,
            name: b.name
          })
          map.set(c.id, list)
        }
      }
    }
    return map
  }, [
    activeBudgets,
    categoriesByBudget.byBudgetId
  ])

  const tableRows: CategoryTableRow[] = useMemo(() => {
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      types: c.types,
      archived: c.archived,
      _count: c._count,
      linkedBudgets: categoryToBudgets.get(c.id) ?? []
    }))
  }, [
    categories,
    categoryToBudgets
  ])

  const labelLookupRef = useRef<CategoryColumnLabelLookup>({
    budgets: new Map()
  })

  const { archiveCategory } = useCategoryTableMutations({
    onSuccess: () => {
      void refetchCategories()
    }
  })

  const handleEditCategory = useCallback(
    (row: CategoryTableRow) => {
      openDrawer('editCategory', {
        categoryId: row.id
      })
    },
    [
      openDrawer
    ]
  )

  const handleCreateCategory = useCallback(() => {
    openDrawer('createCategory', {})
  }, [
    openDrawer
  ])

  const handleArchive = useCallback(
    (row: CategoryTableRow, archived: boolean) => {
      archiveCategory({
        id: row.id,
        archived,
        userId
      })
    },
    [
      archiveCategory,
      userId
    ]
  )

  const columns = useMemo(
    () =>
      createCategoriesTableColumns({
        t,
        labelLookupRef,
        onEdit: handleEditCategory,
        onArchive: handleArchive
      }),
    [
      t,
      handleEditCategory,
      handleArchive
    ]
  )

  const {
    table,
    globalFilter,
    setGlobalFilter,
    columnFilters,
    setColumnFilters,
    activeFilters
  } = useDataTable({
    data: tableRows,
    columns
  })

  const sortedBudgetsSidebar = useMemo(() => {
    return [
      ...activeBudgets
    ].sort((a, b) =>
      a.name.localeCompare(b.name, 'sv', {
        sensitivity: 'base'
      })
    )
  }, [
    activeBudgets
  ])

  const availableTypes = useMemo(() => {
    const seen = new Set<CategoryType>()
    for (const row of tableRows) {
      for (const ty of row.types) {
        seen.add(ty)
      }
    }
    const order: CategoryType[] = [
      CategoryType.EXPENSE,
      CategoryType.INCOME
    ]
    return order
      .filter((ty) => seen.has(ty))
      .map((ty) => ({
        value: ty,
        label:
          ty === CategoryType.INCOME
            ? t('categories.income')
            : t('categories.expense')
      }))
  }, [
    tableRows,
    t
  ])

  const availableBudgetsFilter = useMemo(() => {
    const map = new Map<string, string>()
    for (const b of activeBudgets) {
      map.set(b.id, b.name)
    }
    labelLookupRef.current.budgets = map
    return [
      ...map.entries()
    ]
      .map(([value, label]) => ({
        value,
        label
      }))
      .sort((a, b) =>
        a.label.localeCompare(b.label, 'sv', {
          sensitivity: 'base'
        })
      )
  }, [
    activeBudgets
  ])

  const filterDisabled = tableRows.length === 0
  const filteredRowCount = table.getFilteredRowModel().rows.length

  const tableEmptyMessage = useMemo((): ReactNode | undefined => {
    if (categories.length === 0) {
      return undefined
    }
    if (filteredRowCount === 0) {
      return t('common.noResultsFound')
    }
    return undefined
  }, [
    categories.length,
    filteredRowCount,
    t
  ])

  const pageLoading =
    categoriesLoading || budgetsLoading || categoriesByBudget.isLoading

  const showNoCategories =
    !!householdId && categories.length === 0 && !pageLoading

  return (
    <PageLayout
      title={t('categories.title')}
      description={t('categories.pageDescription')}
      loadingContent={pageLoading}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-hidden lg:flex-row lg:items-stretch">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {showNoCategories ? (
            <NoData
              variant="no-category"
              onAction={handleCreateCategory}
            />
          ) : (
            <DataTable
              table={table}
              columns={columns}
              globalFilter={globalFilter}
              onGlobalFilterChange={setGlobalFilter}
              filterDisabled={filterDisabled}
              onFilterClick={() =>
                openDrawer('categoriesTableFilterDrawer', {
                  columnFilters,
                  onApply: setColumnFilters,
                  availableTypes,
                  availableBudgets: availableBudgetsFilter
                })
              }
              activeFilters={activeFilters}
              actionButton={{
                label: t('categories.createAction'),
                icon: <PlusIcon />,
                onClick: handleCreateCategory,
                disabled: !householdId
              }}
              toolbarLabels={{
                searchPlaceholder: t('common.search'),
                filter: t('common.filter'),
                pillRemoveAriaLabel: t('common.removeFilter')
              }}
              emptyMessage={tableEmptyMessage}
            />
          )}
        </div>
        {!showNoCategories ? (
          <aside
            className="flex min-h-0 w-full max-h-[42vh] shrink-0 flex-col gap-5 overflow-hidden border-gray-200 border-t pt-6 lg:max-h-none lg:w-72 lg:shrink-0 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6"
            aria-label={t('categories.byBudget')}
          >
            <h2 className="type-label shrink-0 text-gray-600">
              {t('categories.byBudget')}
            </h2>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="flex flex-col gap-5 pb-1">
              {sortedBudgetsSidebar.map((b) => {
                const cats = categoriesByBudget.byBudgetId.get(b.id) ?? []
                const sortedCats = [
                  ...cats
                ].sort((a, c2) =>
                  a.name.localeCompare(c2.name, 'sv', {
                    sensitivity: 'base'
                  })
                )
                return (
                  <div
                    key={b.id}
                    className="flex flex-col gap-2"
                  >
                    <p className="type-label text-gray-500">{b.name}</p>
                    <div className="flex flex-row flex-wrap gap-1">
                      {sortedCats.length === 0 ? (
                        <span className="type-label text-muted-foreground">
                          {'\u2014'}
                        </span>
                      ) : (
                        sortedCats.map((c) => (
                          <Badge
                            key={c.id}
                            color={categoryBadgeColor(c.id)}
                            label={c.name}
                          />
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
              </div>
            </div>
          </aside>
        ) : null}
      </div>
    </PageLayout>
  )
}
