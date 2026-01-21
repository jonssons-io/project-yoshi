import { PlusIcon } from 'lucide-react'
import { AccountForm } from '@/forms/AccountForm'
import { useBudgetsList, useCreateAccount } from '@/hooks/api'
import { useDrawer } from '@/hooks/use-drawer'
import { Card } from '../card/Card'
import { Button } from '../ui/button'

interface NoAccountProps {
	userId: string
	householdId: string
	onAccountCreated?: () => void
}

export const NoAccount = ({
	userId,
	householdId,
	onAccountCreated
}: NoAccountProps) => {
	const { openDrawer, closeDrawer } = useDrawer()

	// Fetch budgets for linking
	const { data: budgets } = useBudgetsList({
		householdId,
		userId,
		enabled: !!householdId
	})

	const { mutate: createAccount } = useCreateAccount({
		onSuccess: () => {
			closeDrawer()
			onAccountCreated?.()
		}
	})

	const handleCreateAccount = () => {
		openDrawer(
			<div className="p-4">
				<h2 className="text-2xl font-bold mb-4">Create Your First Account</h2>
				<p className="text-muted-foreground mb-6">
					An account tracks your actual financial accounts like checking,
					savings, or credit cards.
				</p>
				<AccountForm
					onSubmit={(data) => {
						createAccount({
							...data,
							householdId,
							userId
						})
					}}
					onCancel={closeDrawer}
					submitLabel="Create Account"
					budgets={budgets ?? []}
				/>
			</div>,
			'Create Account'
		)
	}

	return (
		<div className="container py-8 flex items-center justify-center">
			<Card
				title="No Accounts Yet"
				description="Create accounts to start tracking your finances"
			>
				<Button onClick={handleCreateAccount}>
					<PlusIcon className="mr-2 h-4 w-4" />
					Create Your First Account
				</Button>
			</Card>
		</div>
	)
}
