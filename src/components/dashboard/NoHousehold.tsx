import { PlusIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { HouseholdForm } from '@/forms/HouseholdForm'
import { useCreateHousehold } from '@/hooks/api'
import { useDrawer } from '@/hooks/use-drawer'
import { useSelectedHousehold } from '@/hooks/use-selected-household'
import { Card } from '../card/Card'
import { Button } from '../ui/button'

export const NoHousehold = ({ userId }: { userId: string }) => {
	const { t } = useTranslation()
	const { openDrawer, closeDrawer } = useDrawer()
	const { setSelectedHousehold } = useSelectedHousehold(userId)

	const { mutate: createHousehold } = useCreateHousehold({
		onSuccess: (household) => {
			setSelectedHousehold(household.id)
			closeDrawer()
		}
	})

	const handleCreateHousehold = () => {
		openDrawer(
			<div className="p-4">
				<h2 className="text-2xl font-bold mb-4">{t('dashboard.welcome')}</h2>
				<p className="text-muted-foreground mb-6">
					{t('dashboard.createHousehold')}
				</p>
				<HouseholdForm
					onSubmit={(data) => {
						createHousehold({
							name: data.name,
							userId
						})
					}}
					onCancel={closeDrawer}
					submitLabel={t('dashboard.createHouseholdButton')}
				/>
			</div>,
			t('dashboard.createHouseholdButton')
		)
	}

	return (
		<div className="container py-8 flex items-center justify-center">
			<Card
				title={t('dashboard.welcome')}
				description={t('dashboard.createHousehold')}
			>
				<Button onClick={handleCreateHousehold}>
					<PlusIcon className="mr-2 h-4 w-4" />
					{t('dashboard.createHouseholdButton')}
				</Button>
			</Card>
		</div>
	)
}
