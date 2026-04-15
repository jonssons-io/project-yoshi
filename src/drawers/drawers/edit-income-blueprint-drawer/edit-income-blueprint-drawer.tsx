import { Check, HandCoins } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  BlueprintPatchScope,
  CategoryType,
  type UpdateIncomeRequest,
  RecurrenceType
} from '@/api/generated/types.gen'
import { Button } from '@/components/button/button'
import type { ComboboxValue } from '@/components/form'
import {
  createTranslatedZodValidator,
  safeValidateForm,
  useAppForm
} from '@/components/form'
import { useAuth } from '@/contexts/auth-context'
import {
  useAccountsList,
  useCategoriesList,
  useIncomeById,
  useIncomeList,
  useUpdateIncome
} from '@/hooks/api'
import { getErrorMessage } from '@/lib/api-error'
import { formatAccountLabel } from '@/lib/accounts'
import { translateIfLikelyI18nKey } from '@/lib/form-validation'
import { filterIncomeCategories } from '../create-income-drawer/types'

import {
  editIncomeBlueprintObjectSchema,
  editIncomeBlueprintSchema,
  type EditIncomeBlueprintFormValues
} from './schema'

function incomeSourceToUpdate(
  v: EditIncomeBlueprintFormValues['incomeSource']
): Pick<UpdateIncomeRequest, 'incomeSourceId' | 'newIncomeSourceName'> {
  if (typeof v === 'object' && v !== null && 'isNew' in v && v.isNew) {
    return {
      newIncomeSourceName: v.name
    }
  }
  return {
    incomeSourceId: v as string
  }
}

function categoryToUpdate(
  c: EditIncomeBlueprintFormValues['category']
): Pick<UpdateIncomeRequest, 'categoryId' | 'newCategoryName'> {
  if (c == null || c === undefined) return {}
  if (typeof c === 'object' && 'isNew' in c && c.isNew) {
    return {
      newCategoryName: c.name
    }
  }
  if (typeof c === 'string' && c.length > 0) {
    return {
      categoryId: c
    }
  }
  return {}
}

export type EditIncomeBlueprintMode = 'upcoming' | 'all'

export type EditIncomeBlueprintDrawerProps = {
  incomeId: string
  mode: EditIncomeBlueprintMode
  onClose: () => void
}

const DEFAULT_VALUES = {
  name: '',
  incomeSource: '' as ComboboxValue,
  accountId: '',
  amount: 0,
  recurrenceType: RecurrenceType.MONTHLY as RecurrenceType,
  customIntervalDays: undefined as number | undefined | null,
  changeDate: undefined as Date | undefined | null,
  expectedDate: new Date(),
  endDate: undefined as Date | undefined | null,
  category: null as ComboboxValue | null
}

export function EditIncomeBlueprintDrawer({
  incomeId,
  mode,
  onClose
}: EditIncomeBlueprintDrawerProps) {
  const { t } = useTranslation()
  const { userId, householdId } = useAuth()
  const [hasInitializedForm, setHasInitializedForm] = useState(false)

  const {
    data: income,
    isPending: isIncomePending,
    isError: isIncomeError
  } = useIncomeById({
    id: incomeId,
    userId,
    enabled: Boolean(incomeId)
  })

  const { data: accounts = [] } = useAccountsList({
    householdId,
    userId,
    enabled: Boolean(householdId),
    excludeArchived: true
  })

  const { data: categories = [] } = useCategoriesList({
    householdId,
    userId,
    type: CategoryType.INCOME,
    enabled: Boolean(householdId)
  })

  const { data: incomes = [] } = useIncomeList({
    householdId,
    userId,
    enabled: Boolean(householdId)
  })

  const { mutateAsync: updateIncomeAsync, isPending } = useUpdateIncome()

  const incomeSources = useMemo(() => {
    const byId = new Map<
      string,
      {
        id: string
        name: string
      }
    >()
    for (const inc of incomes) {
      if (inc.incomeSource) {
        byId.set(inc.incomeSource.id, {
          id: inc.incomeSource.id,
          name: inc.incomeSource.name
        })
      }
    }
    return [
      ...byId.values()
    ]
  }, [
    incomes
  ])

  const incomeCategories = useMemo(
    () => filterIncomeCategories(categories),
    [
      categories
    ]
  )

  const categoryOptions = useMemo(
    () =>
      incomeCategories.map((c) => ({
        value: c.id,
        label: c.name
      })),
    [
      incomeCategories
    ]
  )

  const accountOptions = useMemo(
    () =>
      accounts.map((a) => ({
        value: a.id,
        label: formatAccountLabel(a)
      })),
    [
      accounts
    ]
  )

  const sourceOptions = useMemo(
    () =>
      incomeSources.map((s) => ({
        value: s.id,
        label: s.name
      })),
    [
      incomeSources
    ]
  )

  const recurrenceOptions = useMemo(
    () => [
      {
        value: RecurrenceType.NONE,
        label: t('recurrence.none')
      },
      {
        value: RecurrenceType.WEEKLY,
        label: t('recurrence.weekly')
      },
      {
        value: RecurrenceType.MONTHLY,
        label: t('recurrence.monthly')
      },
      {
        value: RecurrenceType.QUARTERLY,
        label: t('recurrence.quarterly')
      },
      {
        value: RecurrenceType.YEARLY,
        label: t('recurrence.yearly')
      },
      {
        value: RecurrenceType.CUSTOM,
        label: t('recurrence.custom')
      }
    ],
    [
      t
    ]
  )

  const form = useAppForm({
    defaultValues: DEFAULT_VALUES,
    canSubmitWhenInvalid: true,
    onSubmit: async ({ value }) => {
      const result = safeValidateForm(editIncomeBlueprintSchema, value)
      if (!result.success) {
        const msg = result.errors[0]?.message ?? 'common.error'
        toast.error(translateIfLikelyI18nKey(msg, t))
        return
      }

      if (!income) {
        toast.error(t('income.notFound'))
        return
      }

      if (mode === 'upcoming' && result.data.changeDate == null) {
        toast.error(t('validation.dateRequired'))
        return
      }

      const isUpcoming = mode === 'upcoming'
      const amount = result.data.amount
      if (amount == null) {
        toast.error(t('validation.positive'))
        return
      }

      try {
        await updateIncomeAsync({
          id: incomeId,
          userId,
          updateScope: isUpcoming
            ? BlueprintPatchScope.UPCOMING
            : BlueprintPatchScope.ALL,
          ...(isUpcoming && result.data.changeDate
            ? {
                fromDate: result.data.changeDate
              }
            : {}),
          name: result.data.name,
          ...incomeSourceToUpdate(result.data.incomeSource),
          amount,
          expectedDate: result.data.expectedDate,
          accountId: result.data.accountId,
          ...(isUpcoming
            ? {
                recurrenceType: result.data.recurrenceType,
                customIntervalDays:
                  result.data.recurrenceType === RecurrenceType.CUSTOM
                    ? (result.data.customIntervalDays ?? undefined)
                    : undefined
              }
            : {}),
          ...(result.data.endDate != null
            ? {
                endDate: result.data.endDate
              }
            : {}),
          ...categoryToUpdate(result.data.category)
        })
        toast.success(t('income.updateSuccess'))
        onClose()
      } catch (err) {
        toast.error(getErrorMessage(err))
      }
    }
  })

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset local init flag when opening another income
  useEffect(() => {
    setHasInitializedForm(false)
  }, [
    incomeId
  ])

  useEffect(() => {
    if (!income || hasInitializedForm) return

    form.setFieldValue('name', income.name)
    form.setFieldValue('incomeSource', income.incomeSourceId)
    form.setFieldValue('accountId', income.accountId)
    form.setFieldValue('amount', income.estimatedAmount)
    form.setFieldValue('recurrenceType', income.recurrenceType)
    form.setFieldValue('customIntervalDays', income.customIntervalDays ?? null)
    form.setFieldValue('expectedDate', income.expectedDate)
    form.setFieldValue('endDate', income.endDate ?? null)
    form.setFieldValue('category', income.categoryId ?? null)

    if (mode === 'upcoming') {
      form.setFieldValue('changeDate', income.expectedDate)
    } else {
      form.setFieldValue('changeDate', null)
    }

    setHasInitializedForm(true)
  }, [
    income,
    form,
    hasInitializedForm,
    mode
  ])

  if (isIncomePending || (!hasInitializedForm && !isIncomeError)) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="type-body text-gray-800">{t('common.loading')}</p>
      </div>
    )
  }

  if (isIncomeError || !income) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="type-body text-gray-800">{t('income.notFound')}</p>
      </div>
    )
  }

  return (
    <form
      className="flex h-full min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        {mode === 'upcoming' ? (
          <form.AppField
            name="changeDate"
            validators={{
              onChange: createTranslatedZodValidator(
                editIncomeBlueprintObjectSchema.shape.changeDate,
                t
              )
            }}
          >
            {(field) => (
              <field.DateField
                label={t('income.editBlueprintDrawer.changeDateLabel')}
                labelHelpText={`${t('income.editBlueprintDrawer.changeDateHelp')} ${t('income.editBlueprintDrawer.changeDateContractNote')}`}
                calendarPosition="start"
              />
            )}
          </form.AppField>
        ) : null}

        <form.AppField
          name="name"
          validators={{
            onChange: createTranslatedZodValidator(
              editIncomeBlueprintObjectSchema.shape.name,
              t
            )
          }}
        >
          {(field) => (
            <field.TextField
              label={t('forms.incomeName')}
              placeholder={t('forms.incomePlaceholder')}
              prependIcon={HandCoins}
            />
          )}
        </form.AppField>

        <form.AppField
          name="incomeSource"
          validators={{
            onChange: createTranslatedZodValidator(
              editIncomeBlueprintObjectSchema.shape.incomeSource,
              t
            )
          }}
        >
          {(field) => (
            <field.ComboboxField
              label={t('income.sender')}
              placeholder={t('forms.senderPlaceholder')}
              searchPlaceholder={t('forms.searchPlaceholder')}
              emptyText={t('forms.noMatches')}
              options={sourceOptions}
              allowCreate
              createLabel={t('forms.addSender')}
            />
          )}
        </form.AppField>

        <form.AppField
          name="accountId"
          validators={{
            onChange: createTranslatedZodValidator(
              editIncomeBlueprintObjectSchema.shape.accountId,
              t
            )
          }}
        >
          {(field) => (
            <field.SelectField
              label={t('transfers.toAccount')}
              placeholder={t('forms.selectAccount')}
              options={accountOptions}
            />
          )}
        </form.AppField>

        <form.AppField
          name="amount"
          validators={{
            onChange: createTranslatedZodValidator(
              editIncomeBlueprintObjectSchema.shape.amount,
              t
            )
          }}
        >
          {(field) => (
            <field.NumberField
              label={t('forms.estimatedAmount')}
              placeholder={t('forms.zeroPlaceholder')}
              min={0}
              unit="SEK"
            />
          )}
        </form.AppField>

        <form.AppField
          name="recurrenceType"
          validators={{
            onChange: createTranslatedZodValidator(
              editIncomeBlueprintObjectSchema.shape.recurrenceType,
              t
            )
          }}
        >
          {(field) => (
            <field.SelectField
              label={t('recurrence.label')}
              placeholder={t('forms.selectRecurrence')}
              options={recurrenceOptions}
            />
          )}
        </form.AppField>

        <form.Subscribe selector={(state) => state.values.recurrenceType}>
          {(recurrenceType) =>
            recurrenceType === RecurrenceType.CUSTOM ? (
              <form.AppField
                name="customIntervalDays"
                validators={{
                  onChange: createTranslatedZodValidator(
                    editIncomeBlueprintObjectSchema.shape.customIntervalDays,
                    t
                  )
                }}
              >
                {(field) => (
                  <field.NumberField
                    label={t('forms.intervalDays')}
                    placeholder={t('forms.intervalPlaceholder')}
                    min={1}
                  />
                )}
              </form.AppField>
            ) : null
          }
        </form.Subscribe>

        <form.AppField
          name="expectedDate"
          validators={{
            onChange: createTranslatedZodValidator(
              editIncomeBlueprintObjectSchema.shape.expectedDate,
              t
            )
          }}
        >
          {(field) => (
            <field.DateField
              label={t('income.editBlueprintDrawer.expectedDateLabel')}
              labelHelpText={t('income.editBlueprintDrawer.expectedDateHelp')}
              calendarPosition="start"
            />
          )}
        </form.AppField>

        <form.AppField name="endDate">
          {(field) => (
            <field.DateField
              label={t('forms.endDate')}
              labelHelpText={t('forms.endDateDesc')}
              calendarPosition="start"
            />
          )}
        </form.AppField>

        <form.AppField name="category">
          {(field) => (
            <field.ComboboxField
              label={t('common.category')}
              placeholder={t('forms.selectCategory')}
              searchPlaceholder={t('forms.searchPlaceholder')}
              emptyText={t('forms.noMatches')}
              options={categoryOptions}
              allowCreate
              createLabel={t('forms.createIncomeCategory')}
            />
          )}
        </form.AppField>
      </div>

      <div className="mt-auto flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-gray-200 pt-4">
        <Button
          type="button"
          variant="outlined"
          color="subtle"
          label={t('common.cancel')}
          onClick={onClose}
        />
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <Button
              type="submit"
              variant="filled"
              color="primary"
              icon={<Check aria-hidden={true} />}
              label={t('income.editBlueprintDrawer.submit')}
              disabled={isSubmitting || isPending}
              onClick={() => void 0}
            />
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}
