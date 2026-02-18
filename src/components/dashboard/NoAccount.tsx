import { PlusIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
	const { t } = useTranslation()
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
				<h2 className="text-2xl font-bold mb-4">
					{t('dashboard.createAccount')}
				</h2>
				<p className="text-muted-foreground mb-6">
					{t('dashboard.createAccountDesc')}
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
					submitLabel={t('dashboard.createAccountButton')}
					budgets={budgets ?? []}
				/>
			</div>,
			t('dashboard.createAccountButton')
		)
	}

	return (
		<div className="container py-8 flex items-center justify-center">
			<Card
				title={t('dashboard.noAccountsTitle')}
				description={t('dashboard.noAccountsDesc')}
			>
				<Button onClick={handleCreateAccount}>
					<PlusIcon className="mr-2 h-4 w-4" />
					{t('dashboard.createAccount')}
				</Button>
			</Card>
		</div>
	)
}
