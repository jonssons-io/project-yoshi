import { PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { TransactionType } from '@/api/generated/types.gen'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import {
  useAccountsList,
  useBillsList,
  useBudgetsList,
  useCategoriesList,
  useCreateBill,
  useCreateTransaction,
  useRecipientsList
} from '@/hooks/api'
import { useDrawer } from '@/hooks/use-drawer'
import { getErrorMessage } from '@/lib/api-error'

interface CreateTransactionButtonProps {
  budgetId?: string
  className?: string
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link'
  preSelectedBillId?: string
  instanceId?: string
  defaultTransactionType?: 'INCOME' | 'EXPENSE' | 'TRANSFER'
}

type TransactionDrawerContentProps = {
  budgetId?: string
  householdId: string
  userId: string
  preSelectedBillId?: string
  instanceId?: string
  defaultTransactionType?: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  onClose: () => void
}

function TransactionDrawerContent({
  budgetId,
  householdId,
  userId,
  preSelectedBillId,
  instanceId,
  defaultTransactionType = 'EXPENSE',
  onClose
}: TransactionDrawerContentProps) {
  const { t } = useTranslation()
  const [currentBudgetId, setCurrentBudgetId] = useState(budgetId)
  const [currentTransactionType, setCurrentTransactionType] = useState<
    'INCOME' | 'EXPENSE' | 'TRANSFER'
  >(defaultTransactionType)

  const { data: budgets } = useBudgetsList({
    householdId,
    userId,
    enabled: true
  })

  const { data: categories } = useCategoriesList({
    householdId,
    userId,
    enabled: !!householdId
  })
  const selectableCategories = (categories ?? []).filter(
    (category) => !category.archived
  )

  const { data: accounts } = useAccountsList({
    householdId,
    userId,
    enabled: !!householdId,
    excludeArchived: true
  })

  const { data: bills } = useBillsList({
    householdId,
    budgetId: currentBudgetId,
    userId,
    includeArchived: false,
    enabled: !!householdId && currentTransactionType === TransactionType.EXPENSE
  })

  const { data: recipients } = useRecipientsList({
    householdId,
    userId,
    enabled: true
  })
  const selectableRecipients = (recipients ?? []).filter(
    (recipient) => !recipient.archived
  )

  const { mutate: createTransaction } = useCreateTransaction({
    onSuccess: () => {
      onClose()
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    }
  })

  const { mutate: createBill } = useCreateBill({})

  if (!categories || !accounts) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">{t('transactions.loadingArgs')}</p>
      </div>
    )
  }

  return (
    <TransactionForm
      defaultValues={{
        budgetId: currentBudgetId,
        instanceId: instanceId ?? null,
        transactionType: defaultTransactionType
      }}
      categories={selectableCategories}
      accounts={accounts}
      budgets={budgets ?? []}
      onBudgetChange={setCurrentBudgetId}
      onTransactionTypeChange={setCurrentTransactionType}
      recipients={selectableRecipients}
      bills={(bills ?? [])
        .filter((bill) => !bill.archived)
        .map((bill) => ({
          id: bill.id,
          name: bill.name,
          recipient: bill.recipient.name ?? ''
        }))}
      preSelectedBillId={preSelectedBillId}
      onSubmit={async (data, billData) => {
        const selectedBudgetId = data.budgetId || currentBudgetId || budgetId

        const categoryData =
          data.transactionType === TransactionType.TRANSFER || !data.category
            ? {}
            : typeof data.category === 'string'
              ? {
                  categoryId: data.category
                }
              : {
                  newCategory: {
                    name: data.category.name,
                    type: data.transactionType
                  }
                }

        if (billData && data.transactionType === TransactionType.EXPENSE) {
          await new Promise<string>((resolve, reject) => {
            createBill(
              {
                name: data.name,
                estimatedAmount: data.amount,
                accountId: data.accountId,
                newRecipientName: billData.recipient,
                startDate: billData.startDate,
                recurrenceType: billData.recurrenceType,
                customIntervalDays: billData.customIntervalDays ?? undefined,
                ...(data.category
                  ? typeof data.category === 'string'
                    ? {
                        categoryId: data.category
                      }
                    : {
                        newCategoryName: data.category.name
                      }
                  : {}),
                budgetId: selectedBudgetId,
                householdId,
                userId,
                lastPaymentDate: billData.lastPaymentDate ?? undefined
              },
              {
                onSuccess: (bill) => resolve(bill.id),
                onError: reject
              }
            )
          })
        }

        const recipientData = data.recipient
          ? typeof data.recipient === 'string'
            ? {
                recipientId: data.recipient
              }
            : {
                newRecipientName: data.recipient.name
              }
          : {}

        createTransaction({
          type: data.transactionType,
          name: data.name,
          amount: data.amount,
          date: data.date,
          accountId: data.accountId,
          notes: data.notes,
          ...(data.transactionType === TransactionType.TRANSFER
            ? {
                transferToAccountId: data.transferToAccountId || undefined
              }
            : {}),
          ...(data.transactionType === TransactionType.TRANSFER
            ? {}
            : categoryData),
          ...(data.transactionType === TransactionType.TRANSFER
            ? {}
            : recipientData),
          ...(data.transactionType === TransactionType.EXPENSE
            ? {
                budgetId: selectedBudgetId
              }
            : {}),
          instanceId: data.instanceId || undefined,
          userId
        })
      }}
      onCancel={onClose}
      submitLabel={t('transactions.createTransaction')}
    />
  )
}

export function CreateTransactionButton({
  budgetId: propsBudgetId,
  className,
  variant = 'default',
  preSelectedBillId,
  instanceId,
  defaultTransactionType = 'EXPENSE'
}: CreateTransactionButtonProps) {
  const { t } = useTranslation()
  const { openDrawer, closeDrawer } = useDrawer()
  const { userId, householdId } = useAuth()
  const budgetId = propsBudgetId ?? undefined

  const handleClick = () => {
    if (!householdId) return

    openDrawer(
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">
          {t('transactions.createTransaction')}
        </h2>
        <p className="text-muted-foreground mb-6">
          {t('transactions.createTransactionDesc')}
        </p>

        <TransactionDrawerContent
          budgetId={budgetId}
          householdId={householdId}
          userId={userId}
          preSelectedBillId={preSelectedBillId}
          instanceId={instanceId}
          defaultTransactionType={defaultTransactionType}
          onClose={closeDrawer}
        />
      </div>,
      t('transactions.createTransaction')
    )
  }

  return (
    <Button
      onClick={handleClick}
      className={className}
      variant={variant}
      disabled={!householdId}
    >
      <PlusIcon className="mr-2 h-4 w-4" />
      {t('transactions.addTransaction')}
    </Button>
  )
}
