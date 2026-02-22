import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import type { Budget } from '@/api/generated/types.gen'
import { useBudgetsList } from '@/hooks/api/queries/use-budgets-query'
import { useCreateAllocationMutation } from '@/hooks/api/use-allocations'

interface AllocationDrawerProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	householdId: string
	userId: string
	preselectedBudgetId?: string
}

export function AllocationDrawer({
	open,
	onOpenChange,
	householdId,
	userId,
	preselectedBudgetId
}: AllocationDrawerProps) {
	const [amount, setAmount] = React.useState('')
	const [budgetId, setBudgetId] = React.useState(preselectedBudgetId || '')
	const { t } = useTranslation()

	const amountId = React.useId()
	const budgetSelectId = React.useId()

	const budgetsQuery = useBudgetsList({ householdId, userId })
	const createMutation = useCreateAllocationMutation()

	React.useEffect(() => {
		if (open) {
			setAmount('')
			setBudgetId(preselectedBudgetId || '')
		}
	}, [open, preselectedBudgetId])

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!budgetId || !amount) return

		createMutation.mutate(
			{
				budgetId,
				amount: Number.parseFloat(amount),
				userId
			},
			{
				onSuccess: () => {
					onOpenChange(false)
				}
			}
		)
	}

	const budgets = budgetsQuery.data || []

	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent>
				<form onSubmit={handleSubmit} className="h-full flex flex-col">
					<DrawerHeader>
						<DrawerTitle>{t('plan.allocationDrawer.title')}</DrawerTitle>
						<DrawerDescription>
							{t('plan.allocationDrawer.description')}
						</DrawerDescription>
					</DrawerHeader>
					<div className="p-4 space-y-4">
						<div className="space-y-2">
							<Label htmlFor={budgetSelectId}>
								{t('plan.allocationDrawer.budget')}
							</Label>
							<Select
								value={budgetId}
								onValueChange={setBudgetId}
								disabled={!!preselectedBudgetId}
							>
								<SelectTrigger id={budgetSelectId}>
									<SelectValue
										placeholder={t('plan.allocationDrawer.selectBudget')}
									/>
								</SelectTrigger>
								<SelectContent>
									{budgets.map((budget: Budget) => (
										<SelectItem key={budget.id} value={budget.id}>
											{budget.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor={amountId}>{t('common.amount')}</Label>
							<Input
								id={amountId}
								type="number"
								min="0.01"
								step="0.01"
								placeholder={t('forms.zeroPlaceholder')}
								value={amount}
								onChange={(e) => setAmount(e.target.value)}
							/>
						</div>
					</div>
					<DrawerFooter>
						<Button
							type="submit"
							disabled={createMutation.isPending || !budgetId || !amount}
						>
							{createMutation.isPending
								? t('plan.allocationDrawer.allocating')
								: t('plan.allocationDrawer.allocate')}
						</Button>
						<Button
							variant="outline"
							onClick={() => onOpenChange(false)}
							type="button"
						>
							{t('common.cancel')}
						</Button>
					</DrawerFooter>
				</form>
			</DrawerContent>
		</Drawer>
	)
}
