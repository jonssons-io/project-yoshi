/**
 * Accounts page - Manage financial accounts
 */

import { createFileRoute } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { AccountsTable } from './-components/AccountsTable'

export const Route = createFileRoute('/_authenticated/accounts/')({
	component: AccountsPage
})

function AccountsPage() {
	const { t } = useTranslation()
	const { userId, householdId } = useAuth()
	const [editingAccountId, setEditingAccountId] = useState<string | null>(null)
	const { openDrawer, closeDrawer } = useDrawer()

	// Fetch full account details when editing (including budget links)
	const { data: editingAccount } = useAccountById({
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
		}
	})

	const { mutate: updateAccount } = useUpdateAccount({
		onSuccess: () => {
			refetch()
			setEditingAccountId(null)
			closeDrawer()
		}
	})

	const handleEditAccount = () => {
		if (!editingAccount) return

		openDrawer(
			<div className="p-4">
				<h2 className="text-2xl font-bold mb-4">{t('accounts.edit')}</h2>
				<p className="text-muted-foreground mb-6">{t('accounts.editDesc')}</p>
				<AccountForm
					defaultValues={{
						name: editingAccount.name,
						externalIdentifier: editingAccount.externalIdentifier ?? '',
						initialBalance: editingAccount.initialBalance,
						budgetIds: editingAccount.budgets.map((b) => b.budgetId)
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

	// Open drawer when editingAccountId is set
	useEffect(() => {
		if (editingAccountId && editingAccount) {
			handleEditAccount()
		}
	}, [editingAccountId, editingAccount, handleEditAccount])

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
