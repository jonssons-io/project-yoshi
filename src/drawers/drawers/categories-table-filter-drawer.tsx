import type { ColumnFiltersState } from '@tanstack/react-table'
import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { CategoryType } from '@/api/generated/types.gen'
import { Checkbox } from '@/components/checkbox/checkbox'
import { FilterMultiselect } from '@/components/filter-multiselect/filter-multiselect'
import { FilterDrawerFooter } from '@/drawers/filter-drawer-footer'
import {
  readArrayFilter,
  stripDrawerFilters,
  toggleFilterValue
} from '@/drawers/filter-drawer-helpers'
import {
  categoryArchivedFilterNo,
  categoryArchivedFilterYes
} from '@/routes/_authenticated/categories/-components/categories-table'

type SelectOption = {
  value: string
  label: string
}

export type CategoriesTableFilterDrawerProps = {
  columnFilters: ColumnFiltersState
  onApply: (filters: ColumnFiltersState) => void
  availableTypes: SelectOption[]
  availableBudgets: SelectOption[]
  onClose: () => void
}

const FILTER_IDS = [
  'categoryTypes',
  'budgetIds',
  'archived'
] as const

/**
 * Column filters for the categories data table (type, budgets, archived).
 */
export function CategoriesTableFilterDrawer({
  columnFilters,
  onApply,
  availableTypes,
  availableBudgets,
  onClose
}: CategoriesTableFilterDrawerProps) {
  const { t } = useTranslation()
  const idPrefix = useId()

  const [selectedTypes, setSelectedTypes] = useState<CategoryType[]>(() =>
    readArrayFilter<CategoryType>(columnFilters, 'categoryTypes', [])
  )
  const [selectedBudgetIds, setSelectedBudgetIds] = useState<string[]>(() =>
    readArrayFilter(columnFilters, 'budgetIds', [])
  )
  const [selectedArchived, setSelectedArchived] = useState<string[]>(() =>
    readArrayFilter(columnFilters, 'archived', [])
  )

  useEffect(() => {
    setSelectedTypes(
      readArrayFilter<CategoryType>(columnFilters, 'categoryTypes', [])
    )
    setSelectedBudgetIds(readArrayFilter(columnFilters, 'budgetIds', []))
    setSelectedArchived(readArrayFilter(columnFilters, 'archived', []))
  }, [
    columnFilters
  ])

  const handleReset = () => {
    setSelectedTypes([])
    setSelectedBudgetIds([])
    setSelectedArchived([])
    onApply(stripDrawerFilters(columnFilters, FILTER_IDS))
    onClose()
  }

  const handleApply = () => {
    const nextFilters = stripDrawerFilters(columnFilters, FILTER_IDS)

    if (selectedTypes.length > 0) {
      nextFilters.push({
        id: 'categoryTypes',
        value: selectedTypes as CategoryType[]
      })
    }
    if (selectedBudgetIds.length > 0) {
      nextFilters.push({
        id: 'budgetIds',
        value: selectedBudgetIds
      })
    }
    const wantsYes = selectedArchived.includes(categoryArchivedFilterYes)
    const wantsNo = selectedArchived.includes(categoryArchivedFilterNo)
    if (wantsYes !== wantsNo) {
      nextFilters.push({
        id: 'archived',
        value: wantsYes
          ? [
              categoryArchivedFilterYes
            ]
          : [
              categoryArchivedFilterNo
            ]
      })
    }

    onApply(nextFilters)
    onClose()
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        <div className="flex flex-col gap-2">
          <p className="type-label text-gray-600">{t('categories.type')}</p>
          <div className="flex flex-col gap-3">
            {availableTypes.map((opt) => (
              <Checkbox
                key={opt.value}
                id={`${idPrefix}-categories-type-${opt.value}`}
                checked={selectedTypes.includes(opt.value as CategoryType)}
                onCheckedChange={(checked) => {
                  setSelectedTypes((current) =>
                    toggleFilterValue(
                      current,
                      opt.value as CategoryType,
                      checked
                    )
                  )
                }}
                label={opt.label}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <p className="type-label text-gray-600">{t('categories.budgets')}</p>
          <FilterMultiselect
            value={selectedBudgetIds}
            onChange={setSelectedBudgetIds}
            options={availableBudgets}
            placeholder={t('common.selectAnOption')}
            searchPlaceholder={t('common.search')}
          />
        </div>
        <div className="flex flex-col gap-2">
          <p className="type-label text-gray-600">{t('common.archived')}</p>
          <div className="flex flex-col gap-3">
            <Checkbox
              id={`${idPrefix}-categories-archived-yes`}
              checked={selectedArchived.includes(categoryArchivedFilterYes)}
              onCheckedChange={(checked) => {
                setSelectedArchived((current) =>
                  toggleFilterValue(current, categoryArchivedFilterYes, checked)
                )
              }}
              label={t('common.yes')}
            />
            <Checkbox
              id={`${idPrefix}-categories-archived-no`}
              checked={selectedArchived.includes(categoryArchivedFilterNo)}
              onCheckedChange={(checked) => {
                setSelectedArchived((current) =>
                  toggleFilterValue(current, categoryArchivedFilterNo, checked)
                )
              }}
              label={t('common.no')}
            />
          </div>
        </div>
      </div>
      <FilterDrawerFooter
        onReset={handleReset}
        onApply={handleApply}
      />
    </div>
  )
}
