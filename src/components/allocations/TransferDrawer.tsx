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
import type { Budget } from '@/generated/prisma/client'
import { useBudgetsList } from '@/hooks/api/queries/use-budgets-query'
import { useTransferAllocationMutation } from '@/hooks/api/use-allocations'

interface TransferDrawerProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	householdId: string
	userId: string
	preselectedSourceBudgetId?: string
}

export function TransferDrawer({
	open,
	onOpenChange,
	householdId,
	userId,
	preselectedSourceBudgetId
}: TransferDrawerProps) {
	const [amount, setAmount] = React.useState('')
	const [fromBudgetId, setFromBudgetId] = React.useState(
		preselectedSourceBudgetId || ''
	)
	const [toBudgetId, setToBudgetId] = React.useState('')
	const { t } = useTranslation()

	const amountId = React.useId()
	const fromBudgetIdId = React.useId()
	const toBudgetIdId = React.useId()

	const budgetsQuery = useBudgetsList({ householdId, userId })
	const transferMutation = useTransferAllocationMutation()

	React.useEffect(() => {
		if (open) {
			setAmount('')
			setFromBudgetId(preselectedSourceBudgetId || '')
			setToBudgetId('')
		}
	}, [open, preselectedSourceBudgetId])

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!fromBudgetId || !toBudgetId || !amount) return

		transferMutation.mutate(
			{
				fromBudgetId,
				toBudgetId,
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
						<DrawerTitle>{t('plan.transferDrawer.title')}</DrawerTitle>
						<DrawerDescription>
							{t('plan.transferDrawer.description')}
						</DrawerDescription>
					</DrawerHeader>
					<div className="p-4 space-y-4">
						<div className="space-y-2">
							<Label htmlFor={fromBudgetIdId}>
								{t('plan.transferDrawer.fromBudget')}
							</Label>
							<Select value={fromBudgetId} onValueChange={setFromBudgetId}>
								<SelectTrigger id={fromBudgetIdId}>
									<SelectValue
										placeholder={t('plan.transferDrawer.selectSource')}
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
							<Label htmlFor={toBudgetIdId}>
								{t('plan.transferDrawer.toBudget')}
							</Label>
							<Select value={toBudgetId} onValueChange={setToBudgetId}>
								<SelectTrigger id={toBudgetIdId}>
									<SelectValue
										placeholder={t('plan.transferDrawer.selectDest')}
									/>
								</SelectTrigger>
								<SelectContent>
									{budgets
										.filter((b) => b.id !== fromBudgetId)
										.map((budget: Budget) => (
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
							disabled={
								transferMutation.isPending ||
								!fromBudgetId ||
								!toBudgetId ||
								!amount
							}
						>
							{transferMutation.isPending
								? t('plan.transferDrawer.transferring')
								: t('plan.transferDrawer.transfer')}
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
