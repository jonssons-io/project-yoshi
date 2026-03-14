/**
 * Accounts page - Manage financial accounts
 */

import { createFileRoute } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Card } from '@/components/card/Card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { AccountForm } from '@/forms/AccountForm'
import {
  useAccountById,
  useAccountsList,
  useBudgetsList,
  useCreateAccount,
  useUpdateAccount
} from '@/hooks/api'
import { useDrawer } from '@/hooks/use-drawer'
import { getErrorMessage } from '@/lib/api-error'
import { AccountsTable } from './-components/AccountsTable'

export const Route = createFileRoute('/_authenticated/accounts/')({
  component: AccountsPage
})

function AccountsPage() {
  const { t } = useTranslation()
  const { userId, householdId } = useAuth()
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)
  const { isOpen, openDrawer, closeDrawer } = useDrawer()
  const wasDrawerOpenRef = useRef(isOpen)

  // Fetch full account details when editing (including budget links)
  const { data: editingAccount, isFetching: isEditingAccountFetching } =
    useAccountById({
      accountId: editingAccountId,
      userId
    })

  const {
    data: accounts,
    isLoading,
    refetch
  } = useAccountsList({
    householdId,
    userId
  })

  // Fetch budgets for linking when creating accounts
  const { data: budgets } = useBudgetsList({
    householdId,
    userId
  })

  const { mutate: createAccount } = useCreateAccount({
    onSuccess: () => {
      refetch()
      closeDrawer()
      toast.success(t('accounts.createSuccess'))
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    }
  })

  const { mutate: updateAccount } = useUpdateAccount({
    onSuccess: () => {
      refetch()
      setEditingAccountId(null)
      closeDrawer()
      toast.success(t('accounts.updateSuccess'))
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    }
  })

  // Open drawer when editingAccountId is set
  useEffect(() => {
    if (editingAccountId && editingAccount && !isEditingAccountFetching) {
      type AccountWithBudgets = {
        budgets?: Array<{
          id?: string
          budgetId?: string
        }>
      }
      const accountWithBudgets = editingAccount as AccountWithBudgets
      const resolvedBudgetIds =
        accountWithBudgets.budgets
          ?.map((budget) => budget.id ?? budget.budgetId)
          .filter((budgetId): budgetId is string => !!budgetId) ?? []

      openDrawer(
        <div className="p-4">
          <h2 className="text-2xl font-bold mb-4">{t('accounts.edit')}</h2>
          <p className="text-muted-foreground mb-6">{t('accounts.editDesc')}</p>
          <AccountForm
            key={editingAccount.id}
            defaultValues={{
              name: editingAccount.name,
              externalIdentifier: editingAccount.externalIdentifier ?? '',
              initialBalance: editingAccount.initialBalance,
              budgetIds: resolvedBudgetIds
            }}
            onSubmit={async (data) => {
              updateAccount({
                id: editingAccount.id,
                userId,
                ...data
              })
            }}
            onCancel={() => {
              setEditingAccountId(null)
              closeDrawer()
            }}
            submitLabel={t('accounts.update')}
            budgets={budgets ?? []}
          />
        </div>,
        t('accounts.edit')
      )
    }
  }, [
    editingAccountId,
    editingAccount,
    isEditingAccountFetching,
    openDrawer,
    closeDrawer,
    updateAccount,
    userId,
    t,
    budgets
  ])

  // Reset edit state whenever drawer is dismissed externally (overlay, ESC, close button)
  useEffect(() => {
    if (wasDrawerOpenRef.current && !isOpen) {
      setEditingAccountId(null)
    }
    wasDrawerOpenRef.current = isOpen
  }, [
    isOpen
  ])

  const handleCreateAccount = () => {
    openDrawer(
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">{t('accounts.create')}</h2>
        <p className="text-muted-foreground mb-6">{t('accounts.createDesc')}</p>
        <AccountForm
          onSubmit={async (data) => {
            createAccount({
              ...data,
              householdId,
              userId
            })
          }}
          onCancel={closeDrawer}
          submitLabel={t('accounts.createAction')}
          budgets={budgets ?? []}
        />
      </div>,
      t('accounts.create')
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center">
        <p className="text-muted-foreground">{t('accounts.loading')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-end">
        <Button onClick={handleCreateAccount}>
          <PlusIcon className="mr-2 h-4 w-4" />
          {t('accounts.add')}
        </Button>
      </div>

      {accounts?.length === 0 ? (
        <Card
          title={t('accounts.noAccounts')}
          description={t('accounts.getStarted')}
        >
          <Button onClick={handleCreateAccount}>
            <PlusIcon className="mr-2 h-4 w-4" />
            {t('accounts.createFirst')}
          </Button>
        </Card>
      ) : (
        <Card>
          <AccountsTable
            userId={userId}
            selectedHouseholdId={householdId}
            setEditingAccountId={setEditingAccountId}
          />
        </Card>
      )}
    </div>
  )
}
