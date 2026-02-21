import { createFileRoute } from '@tanstack/react-router'
import { ArrowLeftRight, Plus } from 'lucide-react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { AllocationDrawer } from '@/components/allocations/AllocationDrawer'
import { TransferDrawer } from '@/components/allocations/TransferDrawer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/contexts/auth-context'
import { useBudgetsList } from '@/hooks/api/queries/use-budgets-query'
import { useAllocationsQuery } from '@/hooks/api/use-allocations'

export const Route = createFileRoute('/_authenticated/plan/')({
	component: PlanPage
})

function PlanPage() {
	const { t } = useTranslation()
	const { userId, householdId } = useAuth()

	// Drawers state
	const [allocationOpen, setAllocationOpen] = React.useState(false)
	const [transferOpen, setTransferOpen] = React.useState(false)
	const [selectedBudgetId, setSelectedBudgetId] = React.useState<
		string | undefined
	>(undefined)

	const allocations = useAllocationsQuery({
		householdId: householdId!,
		userId: userId!
	})
	const budgets = useBudgetsList({ householdId: householdId!, userId: userId! })

	const handleAllocateToBudget = (budgetId: string) => {
		setSelectedBudgetId(budgetId)
		setAllocationOpen(true)
	}

	const handleGeneralAllocate = () => {
		setSelectedBudgetId(undefined)
		setAllocationOpen(true)
	}

	if (allocations.isLoading || budgets.isLoading) {
		return <div className="p-8">{t('plan.loading')}</div>
	}

	const unallocatedAmount = allocations.data?.unallocated ?? 0
	const totalAllocatedAmount = allocations.data?.totalAllocated ?? 0
	const totalFunds = allocations.data?.totalFunds ?? 0

	return (
		<div className="flex flex-col gap-6">
			{/* Toolbar */}
			<div className="flex justify-end gap-2">
				<Button onClick={handleGeneralAllocate}>
					<Plus className="mr-2 h-4 w-4" />
					{t('plan.allocateFunds')}
				</Button>
				<Button variant="outline" onClick={() => setTransferOpen(true)}>
					<ArrowLeftRight className="mr-2 h-4 w-4" />
					{t('plan.transferFunds')}
				</Button>
			</div>

			{/* Summary Cards */}
			<div className="grid gap-4 md:grid-cols-2">
				{/* Total Funds Card */}
				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-medium">
							{t('plan.totalAvailable')}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold">
							{new Intl.NumberFormat('sv-SE', {
								style: 'currency',
								currency: 'SEK'
							}).format(totalFunds)}
						</div>
						<p className="text-xs text-muted-foreground mt-1">
							{t('plan.allocatedPlusUnallocated')}
						</p>
					</CardContent>
				</Card>

				{/* Breakdown Card */}
				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-medium">
							{t('plan.breakdown')}
						</CardTitle>
					</CardHeader>
					<CardContent className="flex justify-between items-center">
						<div>
							<div className="text-sm text-muted-foreground">
								{t('plan.allocated')}
							</div>
							<div className="text-2xl font-bold">
								{new Intl.NumberFormat('sv-SE', {
									style: 'currency',
									currency: 'SEK'
								}).format(totalAllocatedAmount)}
							</div>
						</div>
						<div className="h-8 w-[1px] bg-border mx-4" />
						<div className="text-right">
							<div className="text-sm text-muted-foreground">
								{t('plan.unallocated')}
							</div>
							<div className="text-2xl font-bold text-primary">
								{new Intl.NumberFormat('sv-SE', {
									style: 'currency',
									currency: 'SEK'
								}).format(unallocatedAmount)}
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Budgets Grid */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{budgets.data?.map((budget) => {
					// Calculated fields from backend
					// biome-ignore lint/suspicious/noExplicitAny: Pending typed model alignment
					const allocated = (budget as any).allocatedAmount ?? 0
					// biome-ignore lint/suspicious/noExplicitAny: Pending typed model alignment
					const spent = (budget as any).spentAmount ?? 0
					// biome-ignore lint/suspicious/noExplicitAny: Pending typed model alignment
					const remaining = (budget as any).remainingAmount ?? 0
					const progress = allocated > 0 ? (spent / allocated) * 100 : 0

					return (
						<Card key={budget.id}>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">
									{budget.name}
								</CardTitle>
								<div className="flex gap-1">
									<Button
										size="icon"
										variant="ghost"
										className="h-8 w-8"
										onClick={() => handleAllocateToBudget(budget.id)}
										title={t('plan.allocateToBudget')}
									>
										<Plus className="h-4 w-4" />
									</Button>
								</div>
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									{new Intl.NumberFormat('sv-SE', {
										style: 'currency',
										currency: 'SEK'
									}).format(remaining)}
								</div>
								<p className="text-xs text-muted-foreground">
									{t('plan.spentOf', {
										spent: new Intl.NumberFormat('sv-SE', {
											style: 'currency',
											currency: 'SEK'
										}).format(spent),
										total: new Intl.NumberFormat('sv-SE', {
											style: 'currency',
											currency: 'SEK'
										}).format(allocated)
									})}
								</p>
								<Progress value={progress} className="mt-3" />
							</CardContent>
						</Card>
					)
				})}
			</div>

			{/* Drawers */}
			<AllocationDrawer
				open={allocationOpen}
				onOpenChange={setAllocationOpen}
				householdId={householdId!}
				userId={userId!}
				preselectedBudgetId={selectedBudgetId}
			/>

			<TransferDrawer
				open={transferOpen}
				onOpenChange={setTransferOpen}
				householdId={householdId!}
				userId={userId!}
			/>
		</div>
	)
}
