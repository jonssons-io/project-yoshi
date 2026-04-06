import { ArrowLeftRightIcon } from 'lucide-react'
import { type Dispatch, type SetStateAction, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { CategoryType, TransactionType } from '@/api/generated/types.gen'
import { Switch } from '@/components/ui/switch'
import { useCategoriesList } from '@/hooks/api'

import type { CreateTransactionDrawerForm } from './form-api'
import { SplitExpenseBlock } from './split-expense-block'

export function ExpenseIncomeTransferFields({
  form,
  transactionType,
  accountId,
  budgetId,
  householdId,
  splitSwitchId,
  userId,
  useSplits,
  onToggleSplit,
  accountOptions,
  budgetOptions,
  recipientOptions,
  senderOptions,
  expandedSplitIds,
  setExpandedSplitIds,
  addSplit,
  removeSplit,
  turnOffSplits
}: {
  form: CreateTransactionDrawerForm
  transactionType: TransactionType
  accountId: string
  budgetId: string
  householdId: string
  userId: string
  useSplits: boolean
  splitSwitchId: string
  onToggleSplit: (checked: boolean) => void
  accountOptions: {
    value: string
    label: string
  }[]
  budgetOptions: {
    value: string
    label: string
  }[]
  recipientOptions: {
    value: string
    label: string
  }[]
  senderOptions: {
    value: string
    label: string
  }[]
  expandedSplitIds: Record<string, boolean>
  setExpandedSplitIds: Dispatch<SetStateAction<Record<string, boolean>>>
  addSplit: () => void
  removeSplit: (index: number) => void
  turnOffSplits: () => void
}) {
  const { t } = useTranslation()

  const { data: expenseCategories = [] } = useCategoriesList({
    householdId,
    userId,
    budgetId: budgetId || undefined,
    type: CategoryType.EXPENSE,
    enabled:
      !!householdId &&
      !!budgetId &&
      transactionType === TransactionType.EXPENSE &&
      !useSplits
  })

  const { data: incomeCategories = [] } = useCategoriesList({
    householdId,
    userId,
    type: CategoryType.INCOME,
    enabled: !!householdId && transactionType === TransactionType.INCOME
  })

  const expenseCategoryOptions = useMemo(
    () =>
      expenseCategories
        .filter((c) => !c.archived && c.types.includes(CategoryType.EXPENSE))
        .map((c) => ({
          value: c.id,
          label: c.name
        })),
    [
      expenseCategories
    ]
  )

  const incomeCategoryOptions = useMemo(
    () =>
      incomeCategories
        .filter((c) => !c.archived && c.types.includes(CategoryType.INCOME))
        .map((c) => ({
          value: c.id,
          label: c.name
        })),
    [
      incomeCategories
    ]
  )

  if (transactionType === TransactionType.TRANSFER) {
    return (
      <>
        <form.AppField name="accountId">
          {(field) => (
            <field.SelectField
              label={t('transfers.fromAccount')}
              placeholder={t('forms.selectAccount')}
              options={accountOptions}
            />
          )}
        </form.AppField>

        <form.AppField name="transferToAccountId">
          {(field) => (
            <field.SelectField
              label={t('transfers.toAccount')}
              placeholder={t('transfers.selectToAccount')}
              options={accountOptions.filter((a) => a.value !== accountId)}
            />
          )}
        </form.AppField>

        <form.AppField name="date">
          {(field) => (
            <field.DateField
              label={t('forms.transactionDate')}
              calendarPosition="start"
            />
          )}
        </form.AppField>

        <form.AppField name="amount">
          {(field) => <field.NumberField label={t('common.amount')} />}
        </form.AppField>
      </>
    )
  }

  return (
    <>
      <form.AppField name="name">
        {(field) => (
          <field.TextField
            label={t('forms.transactionName')}
            placeholder={t('forms.placeholderName')}
            prependIcon={ArrowLeftRightIcon}
          />
        )}
      </form.AppField>

      <form.AppField name="date">
        {(field) => (
          <field.DateField
            label={t('forms.transactionDate')}
            calendarPosition="start"
          />
        )}
      </form.AppField>

      {transactionType === TransactionType.EXPENSE ? (
        <form.AppField name="recipient">
          {(field) => (
            <field.ComboboxField
              label={t('common.recipient')}
              placeholder={t('forms.whoReceives')}
              searchPlaceholder={t('forms.searchPlaceholder')}
              emptyText={t('forms.noMatches')}
              options={recipientOptions}
              allowCreate
              createLabel={t('forms.addRecipient')}
            />
          )}
        </form.AppField>
      ) : (
        <form.AppField name="sender">
          {(field) => (
            <field.ComboboxField
              label={t('income.sender')}
              placeholder={t('forms.senderPlaceholder')}
              searchPlaceholder={t('forms.searchPlaceholder')}
              emptyText={t('forms.noMatches')}
              options={senderOptions}
              allowCreate
              createLabel={t('forms.addSender')}
            />
          )}
        </form.AppField>
      )}

      {transactionType === TransactionType.EXPENSE ? (
        <form.AppField name="accountId">
          {(field) => (
            <field.SelectField
              label={t('transfers.fromAccount')}
              placeholder={t('forms.selectAccount')}
              options={accountOptions}
            />
          )}
        </form.AppField>
      ) : (
        <form.AppField name="accountId">
          {(field) => (
            <field.SelectField
              label={t('forms.depositAccount')}
              placeholder={t('forms.selectAccount')}
              options={accountOptions}
            />
          )}
        </form.AppField>
      )}

      {transactionType === TransactionType.EXPENSE ? (
        <div className="flex items-center gap-2">
          <Switch
            checked={useSplits}
            onCheckedChange={onToggleSplit}
            id={splitSwitchId}
          />
          <label
            htmlFor={splitSwitchId}
            className="type-label cursor-pointer text-black"
          >
            {t('forms.splitThisTransaction')}
          </label>
        </div>
      ) : null}

      {transactionType === TransactionType.EXPENSE && useSplits ? (
        <SplitExpenseBlock
          form={form}
          householdId={householdId}
          userId={userId}
          expandedSplitIds={expandedSplitIds}
          setExpandedSplitIds={setExpandedSplitIds}
          addSplit={addSplit}
          removeSplit={removeSplit}
          turnOffSplits={turnOffSplits}
        />
      ) : null}

      {transactionType === TransactionType.EXPENSE && !useSplits ? (
        <>
          <form.AppField name="amount">
            {(field) => <field.NumberField label={t('common.amount')} />}
          </form.AppField>

          <form.AppField name="budgetId">
            {(field) => (
              <field.SelectField
                label={t('allocation.drawer.budget')}
                placeholder={t('forms.selectBudget')}
                options={budgetOptions}
              />
            )}
          </form.AppField>

          <form.AppField name="category">
            {(field) => (
              <field.ComboboxField
                label={t('common.category')}
                placeholder={t('forms.selectCategory')}
                searchPlaceholder={t('forms.searchCategories')}
                emptyText={t('forms.noCategories')}
                options={expenseCategoryOptions}
                allowCreate
                createLabel={t('forms.createExpenseCategory')}
              />
            )}
          </form.AppField>
        </>
      ) : null}

      {transactionType === TransactionType.INCOME ? (
        <>
          <form.AppField name="amount">
            {(field) => <field.NumberField label={t('common.amount')} />}
          </form.AppField>

          <form.AppField name="category">
            {(field) => (
              <field.ComboboxField
                label={t('common.category')}
                placeholder={t('forms.selectCategory')}
                searchPlaceholder={t('forms.searchCategories')}
                emptyText={t('forms.noCategories')}
                options={incomeCategoryOptions}
                allowCreate
                createLabel={t('forms.createIncomeCategory')}
              />
            )}
          </form.AppField>
        </>
      ) : null}
    </>
  )
}
