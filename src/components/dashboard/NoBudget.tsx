import { PlusIcon } from 'lucide-react'
import { BudgetForm } from '@/forms/BudgetForm'
import { useCreateBudget } from '@/hooks/api'
import { useDrawer } from '@/hooks/use-drawer'
import { useSelectedBudget } from '@/hooks/use-selected-budget'
import { Card } from '../card/Card'
import { Button } from '../ui/button'

interface NoBudgetProps {
	userId: string
	householdId: string
}

export const NoBudget = ({ userId, householdId }: NoBudgetProps) => {
	const { openDrawer, closeDrawer } = useDrawer()
	const { setSelectedBudget } = useSelectedBudget(userId)

	const { mutate: createBudget } = useCreateBudget({
		onSuccess: (budget) => {
			setSelectedBudget(budget.id)
			closeDrawer()
		}
	})

	const handleCreateBudget = () => {
		openDrawer(
			<div className="p-4">
				<h2 className="text-2xl font-bold mb-4">Create Your First Budget</h2>
				<p className="text-muted-foreground mb-6">
					A budget helps you track your income and expenses over a period of
					time.
				</p>
				<BudgetForm
					onSubmit={(data) => {
						createBudget({
							name: data.name,
							startDate: data.startDate,
							householdId,
							userId
						})
					}}
					onCancel={closeDrawer}
					submitLabel="Create Budget"
				/>
			</div>,
			'Create Budget'
		)
	}

	return (
		<div className="container py-8 flex items-center justify-center">
			<Card
				title="Welcome to Your Budget App!"
				description="Get started by creating your first budget"
			>
				<Button onClick={handleCreateBudget}>
					<PlusIcon className="mr-2 h-4 w-4" />
					Create Your First Budget
				</Button>
			</Card>
		</div>
	)
}
