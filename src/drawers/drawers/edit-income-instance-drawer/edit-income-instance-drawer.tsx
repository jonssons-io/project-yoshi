import { Check, HandCoins } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  CategoryType,
  type UpdateIncomeInstanceRequest
} from '@/api/generated/types.gen'
import { Alert } from '@/components/alert/alert'
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
  useIncomeInstanceById,
  useIncomeList,
  useUpdateIncomeInstance
} from '@/hooks/api'
import { getErrorMessage } from '@/lib/api-error'
import { formatAccountLabel } from '@/lib/accounts'
import { translateIfLikelyI18nKey } from '@/lib/form-validation'
import { filterIncomeCategories } from '../create-income-drawer/types'

import {
  type EditIncomeInstanceFormValues,
  editIncomeInstanceObjectSchema,
  editIncomeInstanceSchema
} from './schema'

function incomeSourceToUpdate(
  v: EditIncomeInstanceFormValues['incomeSource']
): Pick<UpdateIncomeInstanceRequest, 'incomeSourceId' | 'newIncomeSourceName'> {
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
  c: EditIncomeInstanceFormValues['category']
): Pick<UpdateIncomeInstanceRequest, 'categoryId' | 'newCategoryName'> {
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

export type EditIncomeInstanceDrawerProps = {
  instanceId: string
  onClose: () => void
}

const DEFAULT_VALUES = {
  name: '',
  incomeSource: '' as ComboboxValue,
  accountId: '',
  amount: 0,
  expectedDate: new Date(),
  category: null as ComboboxValue | null
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

      const amount = result.data.amount
      if (amount == null) {
        toast.error(t('validation.positive'))
        return
      }
      try {
        await updateIncomeInstanceAsync({
          id: instance.id,
          userId,
          name: result.data.name,
          amount,
          expectedDate: result.data.expectedDate,
          accountId: result.data.accountId,
          ...incomeSourceToUpdate(result.data.incomeSource),
          ...categoryToUpdate(result.data.category)
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
    form.setFieldValue('incomeSource', instance.incomeSourceId)
    form.setFieldValue('accountId', instance.accountId)
    form.setFieldValue('amount', instance.amount)
    form.setFieldValue('expectedDate', instance.expectedDate)
    form.setFieldValue('category', instance.categoryId ?? null)
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
          name="incomeSource"
          validators={{
            onChange: createTranslatedZodValidator(
              editIncomeInstanceObjectSchema.shape.incomeSource,
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
