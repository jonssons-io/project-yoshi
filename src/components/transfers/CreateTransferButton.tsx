import { ArrowRightLeftIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { TransferForm } from '@/forms/TransferForm'
import { useAccountsList, useCreateTransfer } from '@/hooks/api'
import { useDrawer } from '@/hooks/use-drawer'
import { useSelectedBudget } from '@/hooks/use-selected-budget'

interface CreateTransferButtonProps {
	budgetId?: string
	className?: string
	variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link'
}

export function CreateTransferButton({
	budgetId: propsBudgetId,
	className,
	variant = 'outline'
}: CreateTransferButtonProps) {
	const { openDrawer, closeDrawer } = useDrawer()
	const { userId, householdId } = useAuth()
	const { selectedBudgetId } = useSelectedBudget(userId, householdId)

	const budgetId = propsBudgetId || selectedBudgetId

	const { data: accounts } = useAccountsList({
		householdId,
		userId,
		budgetId: budgetId || undefined,
		enabled: !!budgetId,
		excludeArchived: true
	})

	// Mutation
	const { mutate: createTransfer } = useCreateTransfer({
		onSuccess: () => {
			closeDrawer()
		}
	})

	const handleClick = () => {
		if (!budgetId) return

		openDrawer(
			<div className="p-4">
				<h2 className="text-2xl font-bold mb-4">Transfer Funds</h2>
				<p className="text-muted-foreground mb-6">
					Move money between accounts in this budget
				</p>

				{accounts ? (
					<TransferForm
						accounts={accounts}
						onSubmit={(data) => {
							createTransfer({
								budgetId: budgetId,
								userId,
								fromAccountId: data.fromAccountId,
								toAccountId: data.toAccountId,
								amount: data.amount,
								date: data.date,
								notes: data.notes
							})
						}}
						onCancel={closeDrawer}
					/>
				) : (
					<div className="flex items-center justify-center p-8">
						<p className="text-muted-foreground">Loading accounts...</p>
					</div>
				)}
			</div>,
			'Transfer Funds'
		)
	}

	return (
		<Button
			onClick={handleClick}
			className={className}
			variant={variant}
			disabled={!budgetId}
		>
			<ArrowRightLeftIcon className="mr-2 h-4 w-4" />
			Transfer Funds
		</Button>
	)
}
