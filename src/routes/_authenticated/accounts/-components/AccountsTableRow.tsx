import { PencilIcon, TrashIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import { useAccountBalance } from '@/hooks/api'

interface Account {
	id: string
	name: string
	externalIdentifier: string | null
	initialBalance: number
	isArchived: boolean
	_count: { transactions: number }
}

interface AccountRowProps {
	account: Account
	userId: string
	onEdit: (account: Account) => void
	onDelete: (data: { id: string; userId: string }) => void
	formatCurrency: (amount: number) => string
}

export const AccountRow = ({
	account,
	userId,
	onEdit,
	onDelete,
	formatCurrency
}: AccountRowProps) => {
	const { data: balance } = useAccountBalance({
		accountId: account.id,
		userId
	})

	return (
		<TableRow className={account.isArchived ? 'opacity-50 bg-muted/50' : ''}>
			<TableCell className="font-medium">
				{account.name}
				{account.isArchived && (
					<span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full dark:bg-yellow-900/30 dark:text-yellow-400">
						Archived
					</span>
				)}
			</TableCell>
			<TableCell className="text-muted-foreground">
				{account.externalIdentifier || '—'}
			</TableCell>
			<TableCell className="text-right font-medium">
				{balance ? formatCurrency(balance.currentBalance) : '...'}
			</TableCell>
			<TableCell>{account._count.transactions}</TableCell>
			<TableCell className="text-right">
				<div className="flex justify-end gap-2">
					<Button
						variant="ghost"
						size="icon"
						onClick={() =>
							onEdit({
								id: account.id,
								name: account.name,
								externalIdentifier: account.externalIdentifier,
								initialBalance: account.initialBalance,
								_count: account._count,
								isArchived: account.isArchived
							})
						}
					>
						<PencilIcon className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => {
							if (
								confirm(`Are you sure you want to delete "${account.name}"?`)
							) {
								onDelete({
									id: account.id,
									userId
								})
							}
						}}
					>
						<TrashIcon className="h-4 w-4" />
					</Button>
				</div>
			</TableCell>
		</TableRow>
	)
}
