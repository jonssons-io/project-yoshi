/**
 * Accounts page - Manage financial accounts
 */

import { createFileRoute } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/button/button'
import { Card } from '@/components/card/Card'
import { useAuth } from '@/contexts/auth-context'
import { useAccountsList } from '@/hooks/api'
import { AccountsTable } from './-components/AccountsTable'

export const Route = createFileRoute('/_authenticated/accounts/')({
  component: AccountsPage
})

function AccountsPage() {
  const { t } = useTranslation()
  const { userId, householdId } = useAuth()

  const { data: accounts, isLoading } = useAccountsList({
    householdId,
    userId
  })

  const handleCreateAccount = () => {
    void 0
  }

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto px-4 pt-6 pb-6">
        <p className="text-muted-foreground">{t('accounts.loading')}</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 space-y-6 overflow-auto px-4 pt-6 pb-6">
        {/* Toolbar */}
        <div className="flex items-center justify-end">
          <Button
            onClick={handleCreateAccount}
            icon={<PlusIcon />}
            label={t('accounts.add')}
          />
        </div>

        {accounts?.length === 0 ? (
          <Card
            title={t('accounts.noAccounts')}
            description={t('accounts.getStarted')}
          >
            <Button
              onClick={handleCreateAccount}
              icon={<PlusIcon />}
              label={t('accounts.createFirst')}
            />
          </Card>
        ) : (
          <Card>
            <AccountsTable
              userId={userId}
              selectedHouseholdId={householdId}
            />
          </Card>
        )}
      </div>
    </div>
  )
}
