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
						<DrawerTitle>Allocate Funds</DrawerTitle>
						<DrawerDescription>
							Add funds to a budget from the unallocated pool.
						</DrawerDescription>
					</DrawerHeader>
					<div className="p-4 space-y-4">
						<div className="space-y-2">
							<Label htmlFor={budgetSelectId}>Budget</Label>
							<Select
								value={budgetId}
								onValueChange={setBudgetId}
								disabled={!!preselectedBudgetId}
							>
								<SelectTrigger id={budgetSelectId}>
									<SelectValue placeholder="Select a budget" />
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
							disabled={createMutation.isPending || !budgetId || !amount}
						>
							{createMutation.isPending ? 'Allocating...' : 'Allocate'}
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
