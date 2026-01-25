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
				if (
					confirm(
						'This account has transactions, bills, or transfers and cannot be deleted. Would you like to archive it instead?\n\nArchived accounts are hidden from selection menus but preserve your history.'
					)
				) {
					toggleArchive({
						id: data.id,
						userId: data.userId,
						isArchived: true
					})
				}
			} else {
				alert(`Failed to delete account: ${error.message}`)
			}
		}
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Name</TableHead>
					<TableHead>External ID</TableHead>
					<TableHead className="text-right">Current Balance</TableHead>
					<TableHead>Transactions</TableHead>
					<TableHead className="text-right">Actions</TableHead>
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
