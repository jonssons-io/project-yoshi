import { ArrowRightLeftIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/button/button'
import { useAuth } from '@/contexts/auth-context'

interface CreateTransferButtonProps {
  budgetId?: string
  variant?: React.ComponentProps<typeof Button>['variant']
  color?: React.ComponentProps<typeof Button>['color']
}

export function CreateTransferButton({
  budgetId: _budgetId,
  variant = 'outlined',
  color = 'subtle'
}: CreateTransferButtonProps) {
  const { t } = useTranslation()
  const { householdId } = useAuth()

  const handleClick = () => {
    void 0
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
