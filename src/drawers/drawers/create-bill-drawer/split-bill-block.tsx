import {
  ChevronDownIcon,
  ChevronUpIcon,
  Grid2x2,
  Grid2x2PlusIcon,
  Trash2Icon
} from 'lucide-react'
import { type Dispatch, type SetStateAction, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { CategoryType } from '@/api/generated/types.gen'
import { Button } from '@/components/button/button'
import type { ComboboxValue } from '@/components/form'
import { createTranslatedZodValidator } from '@/components/form'
import { useCategoriesList } from '@/hooks/api'
import { formatCurrency } from '@/lib/utils'

import type { CreateBillDrawerForm } from './form-api'
import { billSplitRowSchema } from './schema'
import type { BillSplitRowValue } from './types'

function SyncBillSplitTotalToAmount({
  form,
  splits
}: {
  form: CreateBillDrawerForm
  splits: BillSplitRowValue[]
}) {
  useEffect(() => {
    const sum = splits.reduce((s, r) => s + (Number(r.amount) || 0), 0)
    const rounded = Number(sum.toFixed(2))
    const current = form.getFieldValue('amount')
    if (Math.abs(rounded - current) > 0.001) {
      form.setFieldValue('amount', rounded)
    }
  }, [
    form,
    splits
  ])

  return null
}

export function SplitBillBlock({
  form,
  householdId,
  userId,
  expandedSplitIds,
  setExpandedSplitIds,
  addSplit,
  removeSplit,
  turnOffSplits
}: {
  form: CreateBillDrawerForm
  householdId: string
  userId: string
  expandedSplitIds: Record<string, boolean>
  setExpandedSplitIds: Dispatch<SetStateAction<Record<string, boolean>>>
  addSplit: () => void
  removeSplit: (index: number) => void
  turnOffSplits: () => void
}) {
  const { t } = useTranslation()

  return (
    <form.Subscribe selector={(s) => s.values.splits as BillSplitRowValue[]}>
      {(splits) => {
        const total = splits.reduce((s, r) => s + (Number(r.amount) || 0), 0)
        return (
          <div className="flex flex-col gap-4">
            <SyncBillSplitTotalToAmount
              form={form}
              splits={splits}
            />
            <p className="type-label text-gray-800">
              {t('forms.totalAmountLabel', {
                amount: formatCurrency(total)
              })}
            </p>
            {splits.map((row, index) => (
              <CreateBillSplitSection
                key={row.id}
                form={form}
                index={index}
                householdId={householdId}
                userId={userId}
                expanded={expandedSplitIds[row.id] ?? true}
                onToggle={() => {
                  setExpandedSplitIds((m) => ({
                    ...m,
                    [row.id]: !(m[row.id] ?? true)
                  }))
                }}
                onRemove={() => {
                  if (splits.length > 1) {
                    removeSplit(index)
                  } else {
                    turnOffSplits()
                  }
                }}
              />
            ))}

            <Button
              type="button"
              variant="outlined"
              color="primary"
              icon={<Grid2x2PlusIcon aria-hidden />}
              label={t('forms.addSection')}
              onClick={addSplit}
            />
          </div>
        )
      }}
    </form.Subscribe>
  )
}

function CreateBillSplitSection({
  form,
  index,
  householdId,
  userId,
  expanded,
  onToggle,
  onRemove
}: {
  form: CreateBillDrawerForm
  index: number
  householdId: string
  userId: string
  expanded: boolean
  onToggle: () => void
  onRemove: () => void
}) {
  const { t } = useTranslation()

  return (
    <form.Subscribe
      selector={(state) => {
        const row = state.values.splits?.[index] as
          | {
              subtitle?: string
              amount?: number
            }
          | undefined
        return {
          subtitle: row?.subtitle ?? '',
          amount: row?.amount ?? 0
        }
      }}
    >
      {({ subtitle, amount }) => {
        const title =
          subtitle.trim().length > 0
            ? subtitle.trim()
            : t('forms.namelessSection')
        const amountLabel = formatCurrency(amount)

        return (
          <div className="flex w-full flex-col gap-2">
            <div className="flex w-full items-center gap-2 bg-gray-100 p-2">
              <button
                type="button"
                className="inline-flex shrink-0 text-red-500"
                aria-label={t('forms.splitBillRemoveSection')}
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove()
                }}
              >
                <Trash2Icon
                  className="size-4"
                  strokeWidth={1.5}
                  aria-hidden
                />
              </button>
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                onClick={onToggle}
              >
                <span className="type-label truncate text-black">
                  {t('forms.splitSectionSummary', {
                    title,
                    amount: amountLabel
                  })}
                </span>
              </button>
              <button
                type="button"
                className="shrink-0 text-gray-600"
                aria-expanded={expanded}
                onClick={onToggle}
              >
                {expanded ? (
                  <ChevronUpIcon
                    className="size-4"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                ) : (
                  <ChevronDownIcon
                    className="size-4"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                )}
              </button>
            </div>

            {expanded ? (
              <CreateBillSplitSectionFields
                form={form}
                index={index}
                householdId={householdId}
                userId={userId}
              />
            ) : null}
          </div>
        )
      }}
    </form.Subscribe>
  )
}

function CreateBillSplitSectionFields({
  form,
  index,
  householdId,
  userId
}: {
  form: CreateBillDrawerForm
  index: number
  householdId: string
  userId: string
}) {
  const { t } = useTranslation()

  const amountValidator = useMemo(
    () => createTranslatedZodValidator(billSplitRowSchema.shape.amount, t),
    [
      t
    ]
  )

  const { data: categories = [] } = useCategoriesList({
    householdId,
    userId,
    type: CategoryType.EXPENSE,
    enabled: Boolean(householdId)
  })

  const categoryOptions = categories
    .filter((c) => !c.archived && c.types.includes(CategoryType.EXPENSE))
    .map((c) => ({
      value: c.id,
      label: c.name
    }))

  return (
    <div className="flex flex-col gap-4">
      <form.AppField name={`splits[${index}].subtitle`}>
        {(field) => (
          <field.TextField
            label={t('forms.sectionNameField')}
            placeholder={t('forms.subtitlePlaceholder')}
            prependIcon={Grid2x2}
          />
        )}
      </form.AppField>

      <form.AppField
        name={`splits[${index}].amount`}
        validators={{
          onSubmit: amountValidator
        }}
      >
        {(field) => <field.NumberField label={t('common.amount')} />}
      </form.AppField>

      <form.AppField
        name={`splits[${index}].category`}
        validators={{
          onSubmit: ({ value }: { value: unknown }) => {
            const v = value as ComboboxValue | null
            if (typeof v === 'string' && v.length > 0) return undefined
            if (
              typeof v === 'object' &&
              v !== null &&
              'isNew' in v &&
              v.isNew &&
              v.name.trim().length > 0
            ) {
              return undefined
            }
            return t('validation.categoryRequired')
          }
        }}
      >
        {(field) => (
          <field.ComboboxField
            label={t('common.category')}
            placeholder={t('forms.selectCategory')}
            searchPlaceholder={t('forms.searchCategories')}
            emptyText={t('forms.noCategories')}
            options={categoryOptions}
            allowCreate
            createLabel={t('forms.createExpenseCategory')}
          />
        )}
      </form.AppField>
    </div>
  )
}
