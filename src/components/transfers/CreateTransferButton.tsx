import { ArrowRightLeftIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { TransactionType } from '@/api/generated/types.gen'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { Button } from '@/components/button/button'
import { useAuth } from '@/contexts/auth-context'
import { useAccountsList, useCreateTransaction } from '@/hooks/api'
import { useDrawer } from '@/hooks/use-drawer'

interface CreateTransferButtonProps {
  budgetId?: string
  variant?: React.ComponentProps<typeof Button>['variant']
  color?: React.ComponentProps<typeof Button>['color']
}

type TransferDrawerContentProps = {
  householdId: string
  userId: string
  onClose: () => void
}

function TransferDrawerContent({
  householdId,
  userId,
  onClose
}: TransferDrawerContentProps) {
  const { t } = useTranslation()
  const { data: accounts } = useAccountsList({
    householdId,
    userId,
    enabled: true,
    excludeArchived: true
  })

  const { mutate: createTransaction } = useCreateTransaction({
    onSuccess: () => {
      onClose()
    }
  })

  if (!accounts) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">{t('transactions.loadingArgs')}</p>
      </div>
    )
  }

  return (
    <TransactionForm
      defaultValues={{
        transactionType: TransactionType.TRANSFER,
        name: t('common.transfer')
      }}
      categories={[]}
      accounts={accounts}
      onSubmit={(data) => {
        createTransaction({
          type: TransactionType.TRANSFER,
          name: data.name,
          amount: data.amount,
          date: data.date,
          accountId: data.accountId,
          transferToAccountId: data.transferToAccountId || undefined,
          notes: data.notes,
          userId
        })
      }}
      onCancel={onClose}
      submitLabel={t('transfers.create')}
    />
  )
}

export function CreateTransferButton({
  budgetId: _budgetId,
  variant = 'outlined',
  color = 'subtle'
}: CreateTransferButtonProps) {
  const { t } = useTranslation()
  const { openDrawer, closeDrawer } = useDrawer()
  const { userId, householdId } = useAuth()

  const handleClick = () => {
    if (!householdId) return

    openDrawer(
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">
          {t('transactions.transferFunds')}
        </h2>
        <p className="text-muted-foreground mb-6">
          {t('transactions.transferFundsDesc')}
        </p>
        <TransferDrawerContent
          householdId={householdId}
          userId={userId}
          onClose={closeDrawer}
        />
      </div>,
      t('transactions.transferFunds')
    )
  }

  return (
    <Button
      onClick={handleClick}
      variant={variant}
      color={color}
      disabled={!householdId}
      icon={<ArrowRightLeftIcon />}
      label={t('transactions.transferFunds')}
    />
  )
}
