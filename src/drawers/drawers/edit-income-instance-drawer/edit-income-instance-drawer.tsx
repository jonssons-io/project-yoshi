import { Check, HandCoins } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { BlueprintUpdateScope, CategoryType } from '@/api/generated/types.gen'
import { Alert } from '@/components/alert/alert'
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
  useIncomeInstanceById,
  useIncomeList,
  useUpdateIncomeInstance
} from '@/hooks/api'
import { getErrorMessage } from '@/lib/api-error'
import { translateIfLikelyI18nKey } from '@/lib/form-validation'
import { filterIncomeCategories } from '../create-income-drawer/types'

import {
  editIncomeInstanceObjectSchema,
  editIncomeInstanceSchema
} from './schema'

export type EditIncomeInstanceDrawerProps = {
  instanceId: string
  onClose: () => void
}

const DEFAULT_VALUES = {
  name: '',
  incomeSourceId: '',
  accountId: '',
  amount: 0,
  expectedDate: new Date(),
  categoryId: '' as string | undefined
}

export function EditIncomeInstanceDrawer({
  instanceId,
  onClose
}: EditIncomeInstanceDrawerProps) {
  const { t } = useTranslation()
  const { userId, householdId } = useAuth()
  const [hasInitializedForm, setHasInitializedForm] = useState(false)

  const {
    data: instance,
    isPending: isInstancePending,
    isError: isInstanceError
  } = useIncomeInstanceById({
    instanceId,
    userId,
    enabled: Boolean(instanceId)
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

  const { mutateAsync: updateIncomeInstanceAsync, isPending } =
    useUpdateIncomeInstance()

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

  const form = useAppForm({
    defaultValues: DEFAULT_VALUES,
    canSubmitWhenInvalid: true,
    onSubmit: async ({ value }) => {
      const result = safeValidateForm(editIncomeInstanceSchema, value)
      if (!result.success) {
        const msg = result.errors[0]?.message ?? 'common.error'
        toast.error(translateIfLikelyI18nKey(msg, t))
        return
      }

      if (!instance) {
        toast.error(t('income.notFound'))
        return
      }

      const trimmedCategory = result.data.categoryId?.trim()
      try {
        await updateIncomeInstanceAsync({
          id: instance.id,
          userId,
          updateType: BlueprintUpdateScope.INSTANCE,
          name: result.data.name,
          amount: result.data.amount,
          expectedDate: result.data.expectedDate,
          accountId: result.data.accountId,
          ...(trimmedCategory
            ? {
                categoryId: trimmedCategory
              }
            : {})
        })
        toast.success(t('income.instanceUpdateSuccess'))
        onClose()
      } catch (err) {
        toast.error(getErrorMessage(err))
      }
    }
  })

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset local init flag when opening another instance
  useEffect(() => {
    setHasInitializedForm(false)
  }, [
    instanceId
  ])

  useEffect(() => {
    if (!instance || hasInitializedForm) return

    form.setFieldValue('name', instance.name)
    form.setFieldValue('incomeSourceId', instance.incomeSourceId)
    form.setFieldValue('accountId', instance.accountId)
    form.setFieldValue('amount', instance.amount)
    form.setFieldValue('expectedDate', instance.expectedDate)
    form.setFieldValue('categoryId', instance.categoryId ?? '')
    setHasInitializedForm(true)
  }, [
    instance,
    form,
    hasInitializedForm
  ])

  if (isInstancePending || (!hasInitializedForm && !isInstanceError)) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="type-body text-gray-800">{t('common.loading')}</p>
      </div>
    )
  }

  if (isInstanceError || !instance) {
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
        <Alert variant="info">
          <span className="font-medium">
            {t('income.editInstanceDrawer.alertScope')}
          </span>
        </Alert>

        <form.AppField
          name="name"
          validators={{
            onChange: createTranslatedZodValidator(
              editIncomeInstanceObjectSchema.shape.name,
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
          name="incomeSourceId"
          validators={{
            onChange: createTranslatedZodValidator(
              editIncomeInstanceObjectSchema.shape.incomeSourceId,
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
              disabled
              labelHelpText={t('income.editInstanceDrawer.senderHelp')}
            />
          )}
        </form.AppField>

        <form.AppField
          name="accountId"
          validators={{
            onChange: createTranslatedZodValidator(
              editIncomeInstanceObjectSchema.shape.accountId,
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
              editIncomeInstanceObjectSchema.shape.amount,
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
          name="expectedDate"
          validators={{
            onChange: createTranslatedZodValidator(
              editIncomeInstanceObjectSchema.shape.expectedDate,
              t
            )
          }}
        >
          {(field) => (
            <field.DateField
              label={t('common.date')}
              calendarPosition="start"
            />
          )}
        </form.AppField>

        <form.AppField name="categoryId">
          {(field) => (
            <field.ComboboxField
              label={t('common.category')}
              placeholder={t('forms.selectCategory')}
              searchPlaceholder={t('forms.searchPlaceholder')}
              emptyText={t('forms.noMatches')}
              options={categoryOptions}
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
              label={t('income.editInstanceDrawer.submit')}
              disabled={isSubmitting || isPending}
              onClick={() => void 0}
            />
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}
