import { useTranslation } from 'react-i18next'
import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import {
	useAccountsList,
	useDeleteAccount,
	useToggleAccountArchive
} from '@/hooks/api'
import { formatCurrency } from '@/lib/utils'
import { AccountRow } from './AccountsTableRow'

export const AccountsTable = ({
	userId,
	selectedHouseholdId,
	setEditingAccountId
}: {
	userId: string
	selectedHouseholdId: string
	setEditingAccountId: (id: string) => void
}) => {
	const { t } = useTranslation()
	const { data: accounts, refetch } = useAccountsList({
		householdId: selectedHouseholdId,
		userId,
		excludeArchived: false // Show all accounts in management table
	})

	const { mutateAsync: deleteAccount } = useDeleteAccount({
		onSuccess: () => {
			refetch()
		}
	})

	const { mutate: toggleArchive } = useToggleAccountArchive({
		onSuccess: () => {
			refetch()
		}
	})

	const handleDelete = async (data: { id: string; userId: string }) => {
		try {
			await deleteAccount(data)
		} catch (error: any) {
			if (error.message?.includes('Archive instead')) {
				if (confirm(t('accounts.archiveInsteadConfirm'))) {
					toggleArchive({
						id: data.id,
						userId: data.userId,
						isArchived: true
					})
				}
			} else {
				alert(`${t('accounts.deleteError')}${error.message}`)
			}
		}
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>{t('common.name')}</TableHead>
					<TableHead>{t('accounts.externalId')}</TableHead>
					<TableHead className="text-right">
						{t('accounts.currentBalance')}
					</TableHead>
					<TableHead>{t('accounts.transactions')}</TableHead>
					<TableHead className="text-right">{t('common.actions')}</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{accounts?.map((account) => (
					<AccountRow
						key={account.id}
						account={account}
						userId={userId}
						onEdit={(acc) => setEditingAccountId(acc.id)}
						onDelete={handleDelete}
						formatCurrency={formatCurrency}
					/>
				))}
			</TableBody>
		</Table>
	)
}
