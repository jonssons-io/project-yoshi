import * as React from 'react'
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
						<DrawerTitle>Transfer Funds</DrawerTitle>
						<DrawerDescription>
							Move allocated funds from one budget to another.
						</DrawerDescription>
					</DrawerHeader>
					<div className="p-4 space-y-4">
						<div className="space-y-2">
							<Label htmlFor={fromBudgetIdId}>From Budget</Label>
							<Select value={fromBudgetId} onValueChange={setFromBudgetId}>
								<SelectTrigger id={fromBudgetIdId}>
									<SelectValue placeholder="Select source budget" />
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
							<Label htmlFor={toBudgetIdId}>To Budget</Label>
							<Select value={toBudgetId} onValueChange={setToBudgetId}>
								<SelectTrigger id={toBudgetIdId}>
									<SelectValue placeholder="Select destination budget" />
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
							<Label htmlFor={amountId}>Amount</Label>
							<Input
								id={amountId}
								type="number"
								min="0.01"
								step="0.01"
								placeholder="0.00"
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
							{transferMutation.isPending ? 'Transferring...' : 'Transfer'}
						</Button>
						<Button
							variant="outline"
							onClick={() => onOpenChange(false)}
							type="button"
						>
							Cancel
						</Button>
					</DrawerFooter>
				</form>
			</DrawerContent>
		</Drawer>
	)
}
