import { HandCoins, PlusIcon } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { CategoryType, RecurrenceType } from '@/api/generated/types.gen'
import { Button } from '@/components/button/button'
import {
  createTranslatedZodValidator,
  safeValidateForm,
  useAppForm
} from '@/components/form'
import { useAuth } from '@/contexts/auth-context'
import {
  useAccountsList,
  useCategoriesList,
  useCreateIncome,
  useIncomeList
} from '@/hooks/api'
import { getErrorMessage } from '@/lib/api-error'
import { translateIfLikelyI18nKey } from '@/lib/form-validation'

import { mapIncomeFormToCreateVariables } from './map-to-request'
import { incomeObjectSchema, incomeSchema } from './schema'
import { CREATE_INCOME_DEFAULT_VALUES, filterIncomeCategories } from './types'

export type CreateIncomeDrawerProps = {
  onClose: () => void
}

export function CreateIncomeDrawer({ onClose }: CreateIncomeDrawerProps) {
  const { t } = useTranslation()
  const { userId, householdId } = useAuth()

  const { mutate: createIncome, isPending } = useCreateIncome()

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

  const incomeSources = useMemo(() => {
    const byId = new Map<
      string,
      {
        id: string
        name: string
      }
    >()
    for (const income of incomes) {
      if (income.incomeSource) {
        byId.set(income.incomeSource.id, {
          id: income.incomeSource.id,
          name: income.incomeSource.name
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
        label: a.name
      })),
    [
      accounts
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
    defaultValues: CREATE_INCOME_DEFAULT_VALUES,
    canSubmitWhenInvalid: true,
    onSubmit: async ({ value }) => {
      const result = safeValidateForm(incomeSchema, value)
      if (!result.success) {
        const msg = result.errors[0]?.message ?? 'common.error'
        toast.error(translateIfLikelyI18nKey(msg, t))
        return
      }

      if (!householdId) {
        toast.error(t('server.badRequest.missingHouseholdId'))
        return
      }

      createIncome(
        mapIncomeFormToCreateVariables(result.data, householdId, userId),
        {
          onSuccess: () => {
            toast.success(t('income.createSuccess'))
            onClose()
          },
          onError: (err) => {
            toast.error(getErrorMessage(err))
          }
        }
      )
    }
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void form.handleSubmit()
      }}
      className="flex h-full min-h-0 flex-1 flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        <form.AppField
          name="name"
          validators={{
            onChange: createTranslatedZodValidator(
              incomeObjectSchema.shape.name,
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
              incomeObjectSchema.shape.incomeSource,
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
              options={incomeSources.map((incomeSource) => ({
                value: incomeSource.id,
                label: incomeSource.name
              }))}
              allowCreate
              createLabel={t('forms.addSender')}
            />
          )}
        </form.AppField>

        <form.AppField
          name="accountId"
          validators={{
            onChange: createTranslatedZodValidator(
              incomeObjectSchema.shape.accountId,
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
              incomeObjectSchema.shape.amount,
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
              incomeObjectSchema.shape.recurrenceType,
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
                    incomeObjectSchema.shape.customIntervalDays,
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
              incomeObjectSchema.shape.expectedDate,
              t
            )
          }}
        >
          {(field) => (
            <field.DateField
              label={t('forms.startDate')}
              labelHelpText={t('forms.incomeStartDateHelp')}
              calendarPosition="start"
            />
          )}
        </form.AppField>

        <form.AppField
          name="endDate"
          validators={{
            onChange: createTranslatedZodValidator(
              incomeObjectSchema.shape.endDate,
              t
            )
          }}
        >
          {(field) => (
            <field.DateField
              label={t('forms.endDate')}
              labelHelpText={t('forms.endDateDesc')}
              calendarPosition="start"
            />
          )}
        </form.AppField>

        <form.AppField
          name="category"
          validators={{
            onChange: createTranslatedZodValidator(
              incomeObjectSchema.shape.category,
              t
            )
          }}
        >
          {(field) => (
            <field.ComboboxField
              label={t('common.category')}
              placeholder={t('forms.selectCategory')}
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
              icon={<PlusIcon aria-hidden />}
              label={t('income.drawerCreateSubmit')}
              disabled={isSubmitting || isPending}
              onClick={() => void 0}
            />
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}
