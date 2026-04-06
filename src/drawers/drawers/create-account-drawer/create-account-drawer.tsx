import { BadgeEuro, FingerprintPattern, Plus } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/button/button'
import { createTranslatedZodValidator, useAppForm } from '@/components/form'
import { useAuth } from '@/contexts/auth-context'
import { useBudgetsList, useCreateAccount } from '@/hooks/api'
import { getErrorMessage } from '@/lib/api-error'
import {
  safeValidateForm,
  translateIfLikelyI18nKey
} from '@/lib/form-validation'

export type CreateAccountDrawerProps = {
  onClose: () => void
}

const DEFAULT_VALUES = {
  name: '',
  externalIdentifier: '',
  initialBalance: null as number | null,
  budgetIds: [] as string[]
}

export function CreateAccountDrawer({ onClose }: CreateAccountDrawerProps) {
  const { t } = useTranslation()
  const { userId, householdId } = useAuth()

  const { data: budgets = [] } = useBudgetsList({
    householdId,
    userId,
    enabled: Boolean(householdId)
  })

  const { mutateAsync: createAccountAsync } = useCreateAccount()

  const budgetOptions = useMemo(
    () =>
      budgets.map((b) => ({
        value: b.id,
        label: b.name
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
        initialBalance: z.preprocess(
          (val) => (val === null ? 0 : val),
          z.number().min(0, 'budgets.drawerInitialBudgetMin')
        ),
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

  const initialBalanceValidator = useMemo(
    () => createTranslatedZodValidator(schema.shape.initialBalance, t),
    [
      schema.shape.initialBalance,
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

      if (!householdId) {
        toast.error(t('server.badRequest.missingHouseholdId'))
        return
      }

      const data = parsed.data

      try {
        const externalId = data.externalIdentifier?.trim()
        await createAccountAsync({
          householdId,
          userId,
          name: data.name,
          initialBalance: data.initialBalance,
          ...(externalId
            ? {
                externalIdentifier: externalId
              }
            : {}),
          ...(data.budgetIds.length > 0
            ? {
                budgetIds: data.budgetIds
              }
            : {})
        })

        toast.success(t('accounts.createSuccess'))
        onClose()
      } catch (err) {
        toast.error(getErrorMessage(err))
      }
    }
  })

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

        <form.AppField
          name="initialBalance"
          validators={{
            onSubmit: initialBalanceValidator
          }}
        >
          {(field) => (
            <field.NumberField
              label={t('accounts.drawerInitialBalance')}
              unit={t('common.currencyCode')}
              min={0}
            />
          )}
        </form.AppField>

        {budgetOptions.length > 0 ? (
          <form.AppField name="budgetIds">
            {(field) => (
              <div className="flex flex-col gap-1">
                <field.MultiselectField
                  label={t('accounts.drawerAvailableBudgets')}
                  placeholder={t('common.selectAnOption')}
                  searchPlaceholder={t('forms.searchPlaceholder')}
                  emptyText={t('accounts.drawerNoBudgets')}
                  options={budgetOptions}
                />
                <p className="type-label text-gray-600">
                  {t('accounts.drawerBudgetsHint')}
                </p>
              </div>
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
              icon={<Plus aria-hidden={true} />}
              label={t('accounts.drawerSubmit')}
              disabled={isSubmitting}
              onClick={() => void 0}
            />
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}
