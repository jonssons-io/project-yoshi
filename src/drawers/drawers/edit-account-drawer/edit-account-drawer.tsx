import { BadgeEuro, Check, FingerprintPattern } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/button/button'
import { createTranslatedZodValidator, useAppForm } from '@/components/form'
import { useAuth } from '@/contexts/auth-context'
import { useAccountById, useBudgetsList, useUpdateAccount } from '@/hooks/api'
import { getErrorMessage } from '@/lib/api-error'
import {
  safeValidateForm,
  translateIfLikelyI18nKey
} from '@/lib/form-validation'

export type EditAccountDrawerProps = {
  id: string
  onClose: () => void
}

const DEFAULT_VALUES = {
  name: '',
  externalIdentifier: '',
  budgetIds: [] as string[]
}

export function EditAccountDrawer({ id, onClose }: EditAccountDrawerProps) {
  const { t } = useTranslation()
  const { userId, householdId } = useAuth()
  const [hasInitializedForm, setHasInitializedForm] = useState(false)

  const { data: account, isPending: isAccountPending } = useAccountById({
    accountId: id,
    userId,
    enabled: Boolean(id)
  })

  const { data: budgets = [], isPending: isBudgetsPending } = useBudgetsList({
    householdId,
    userId,
    enabled: Boolean(householdId)
  })

  const { mutateAsync: updateAccountAsync } = useUpdateAccount()

  const budgetOptions = useMemo(
    () =>
      budgets.map((budget) => ({
        value: budget.id,
        label: budget.name
      })),
    [
      budgets
    ]
  )

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, 'validation.accountNameRequired'),
        externalIdentifier: z.string().optional(),
        budgetIds: z.array(z.string())
      }),
    []
  )

  const nameValidator = useMemo(
    () => createTranslatedZodValidator(schema.shape.name, t),
    [
      schema.shape.name,
      t
    ]
  )

  const form = useAppForm({
    defaultValues: DEFAULT_VALUES,
    canSubmitWhenInvalid: true,
    onSubmit: async ({ value }) => {
      const parsed = safeValidateForm(schema, value)
      if (!parsed.success) {
        const msg = parsed.errors[0]?.message ?? 'common.error'
        toast.error(translateIfLikelyI18nKey(msg, t))
        return
      }

      if (!account) {
        toast.error(t('accounts.notFound'))
        return
      }

      try {
        const externalId = parsed.data.externalIdentifier?.trim()
        await updateAccountAsync({
          id: account.id,
          userId,
          name: parsed.data.name,
          externalIdentifier: externalId ? externalId : null,
          budgetIds: parsed.data.budgetIds
        })

        toast.success(t('accounts.updateSuccess'))
        onClose()
      } catch (err) {
        toast.error(getErrorMessage(err))
      }
    }
  })

  useEffect(() => {
    if (!account || hasInitializedForm) return

    form.setFieldValue('name', account.name)
    form.setFieldValue('externalIdentifier', account.externalIdentifier ?? '')
    form.setFieldValue(
      'budgetIds',
      account.budgets.map((budget) => budget.id)
    )
    setHasInitializedForm(true)
  }, [
    account,
    form,
    hasInitializedForm
  ])

  if (!hasInitializedForm && (isAccountPending || isBudgetsPending)) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="type-body text-gray-800">{t('common.loading')}</p>
      </div>
    )
  }

  if (!account) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="type-body text-gray-800">{t('accounts.notFound')}</p>
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
        <form.AppField
          name="name"
          validators={{
            onSubmit: nameValidator
          }}
        >
          {(field) => (
            <field.TextField
              label={t('forms.accountName')}
              placeholder={t('forms.accountNamePlaceholder')}
              prependIcon={BadgeEuro}
            />
          )}
        </form.AppField>

        <form.AppField name="externalIdentifier">
          {(field) => (
            <field.TextField
              label={t('forms.externalId')}
              placeholder={t('forms.externalIdPlaceholder')}
              prependIcon={FingerprintPattern}
            />
          )}
        </form.AppField>

        {budgetOptions.length > 0 ? (
          <form.AppField name="budgetIds">
            {(field) => (
              <field.MultiselectField
                label={t('accounts.drawerAvailableBudgets')}
                placeholder={t('common.selectAnOption')}
                searchPlaceholder={t('forms.searchPlaceholder')}
                emptyText={t('accounts.drawerNoBudgets')}
                options={budgetOptions}
              />
            )}
          </form.AppField>
        ) : null}
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
              label={t('accounts.edit')}
              disabled={isSubmitting}
              onClick={() => void 0}
            />
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}
