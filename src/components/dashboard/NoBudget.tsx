import { PlusIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
	const { t } = useTranslation()
	const { openDrawer, closeDrawer } = useDrawer()
	const { setSelectedBudget } = useSelectedBudget(userId, householdId)

	const { mutate: createBudget } = useCreateBudget({
		onSuccess: (budget) => {
			setSelectedBudget(budget.id)
			closeDrawer()
		}
	})

	const handleCreateBudget = () => {
		openDrawer(
			<div className="p-4">
				<h2 className="text-2xl font-bold mb-4">
					{t('dashboard.createBudget')}
				</h2>
				<p className="text-muted-foreground mb-6">
					{t('dashboard.selectBudgetHelp')}
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
					submitLabel={t('dashboard.createBudgetButton')}
				/>
			</div>,
			t('dashboard.createBudgetButton')
		)
	}

	return (
		<div className="container py-8 flex items-center justify-center">
			<Card
				title={t('dashboard.welcome')}
				description={t('dashboard.createBudget')}
			>
				<Button onClick={handleCreateBudget}>
					<PlusIcon className="mr-2 h-4 w-4" />
					{t('dashboard.createBudgetButton')}
				</Button>
			</Card>
		</div>
	)
}
