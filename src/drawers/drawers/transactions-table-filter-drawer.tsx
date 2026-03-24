import type { ColumnFiltersState } from '@tanstack/react-table'
import { CheckIcon, Undo2Icon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { TransactionType } from '@/api/generated/types.gen'
import { Button } from '@/components/button/button'
import { Checkbox } from '@/components/checkbox/checkbox'

const TYPE_ORDER: TransactionType[] = [
  TransactionType.INCOME,
  TransactionType.EXPENSE,
  TransactionType.TRANSFER
]

export type TransactionsTableFilterDrawerProps = {
  columnFilters: ColumnFiltersState
  onApply: (filters: ColumnFiltersState) => void
  availableTransactionTypes: TransactionType[]
  onClose: () => void
}

function selectionFromFilters(
  columnFilters: ColumnFiltersState,
  available: TransactionType[]
): TransactionType[] {
  const entry = columnFilters.find((f) => f.id === 'type')
  const value = entry?.value
  if (Array.isArray(value) && value.length > 0) {
    const kept = (value as TransactionType[]).filter((t) =>
      available.includes(t)
    )
    if (kept.length > 0) return kept
  }
  return [
    ...available
  ]
}

/**
 * Filter drawer for the transactions table: transaction types present in the current data only.
 */
export function TransactionsTableFilterDrawer({
  columnFilters,
  onApply,
  availableTransactionTypes,
  onClose
}: TransactionsTableFilterDrawerProps) {
  const { t } = useTranslation()
  const [selectedTypes, setSelectedTypes] = useState<TransactionType[]>(() =>
    selectionFromFilters(columnFilters, availableTransactionTypes)
  )

  useEffect(() => {
    setSelectedTypes(
      selectionFromFilters(columnFilters, availableTransactionTypes)
    )
  }, [
    columnFilters,
    availableTransactionTypes
  ])

  const typeOptions = useMemo(() => {
    const ordered = TYPE_ORDER.filter((type) =>
      availableTransactionTypes.includes(type)
    )
    return ordered.map((value) => ({
      value,
      label:
        value === TransactionType.INCOME
          ? t('transactions.income')
          : value === TransactionType.EXPENSE
            ? t('transactions.expense')
            : t('common.transfer')
    }))
  }, [
    availableTransactionTypes,
    t
  ])

  const toggleType = (type: TransactionType, checked: boolean) => {
    setSelectedTypes((prev) => {
      if (checked) {
        if (prev.includes(type)) return prev
        return [
          ...prev,
          type
        ]
      }
      return prev.filter((x) => x !== type)
    })
  }

  const handleApply = () => {
    const withoutType = columnFilters.filter((f) => f.id !== 'type')
    if (
      selectedTypes.length === 0 ||
      selectedTypes.length >= availableTransactionTypes.length
    ) {
      onApply(withoutType)
      onClose()
      return
    }
    onApply([
      ...withoutType,
      {
        id: 'type',
        value: selectedTypes
      }
    ])
    onClose()
  }

  const handleReset = () => {
    onApply(columnFilters.filter((f) => f.id !== 'type'))
    onClose()
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <p className="type-label text-gray-600">{t('forms.transactionType')}</p>
        <div className="flex flex-col gap-3">
          {typeOptions.map((opt) => (
            <Checkbox
              key={opt.value}
              id={`tx-filter-type-${opt.value}`}
              checked={selectedTypes.includes(opt.value)}
              onCheckedChange={(checked) => toggleType(opt.value, checked)}
              label={opt.label}
            />
          ))}
        </div>
      </div>
      <div className="flex shrink-0 flex-row flex-wrap justify-end gap-2 border-t border-gray-300 pt-4">
        <Button
          type="button"
          variant="outlined"
          color="primary"
          label={t('common.clearAllFilters')}
          icon={
            <Undo2Icon
              className="size-4 stroke-[1.5]"
              aria-hidden={true}
            />
          }
          onClick={handleReset}
        />
        <Button
          type="button"
          variant="filled"
          color="primary"
          label={t('transactions.applyFilters')}
          icon={
            <CheckIcon
              className="size-4 stroke-[1.5]"
              aria-hidden={true}
            />
          }
          onClick={handleApply}
        />
      </div>
    </div>
  )
}
