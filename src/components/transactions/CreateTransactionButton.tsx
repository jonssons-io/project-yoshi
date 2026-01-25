import { PlusIcon } from 'lucide-react'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import {
	useAccountsList,
	useBillsList,
	useCategoriesList,
	useCreateBill,
	useCreateTransaction,
	useRecipientsList
} from '@/hooks/api'
import { useDrawer } from '@/hooks/use-drawer'
import { useSelectedBudget } from '@/hooks/use-selected-budget'

interface CreateTransactionButtonProps {
	budgetId?: string
	className?: string
	variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link'
}

export function CreateTransactionButton({
	budgetId: propsBudgetId,
	className,
	variant = 'default'
}: CreateTransactionButtonProps) {
	const { openDrawer, closeDrawer } = useDrawer()
	const { userId, householdId } = useAuth()
	const { selectedBudgetId } = useSelectedBudget(userId, householdId)

	const budgetId = propsBudgetId || selectedBudgetId

	// Data fetching
	const { data: categories } = useCategoriesList({
		householdId,
		userId,
		budgetId: budgetId || undefined,
		enabled: !!budgetId
	})

	const { data: accounts } = useAccountsList({
		householdId,
		userId,
		budgetId: budgetId || undefined,
		enabled: !!budgetId,
		excludeArchived: true
	})

	const { data: bills } = useBillsList({
		budgetId: budgetId ?? '',
		userId,
		includeArchived: false,
		enabled: !!budgetId
	})

	const { data: recipients } = useRecipientsList({
		householdId,
		userId,
		enabled: !!householdId
	})

	// Mutations
	const { mutate: createTransaction } = useCreateTransaction({
		onSuccess: () => {
			closeDrawer()
		}
	})

	const { mutate: createBill } = useCreateBill({})

	const handleClick = () => {
		if (!budgetId) return

		openDrawer(
			<div className="p-4">
				<h2 className="text-2xl font-bold mb-4">Create New Transaction</h2>
				<p className="text-muted-foreground mb-6">
					Add a new income or expense transaction
				</p>

				{categories && accounts ? (
					<TransactionForm
						categories={categories}
						accounts={accounts}
						recipients={recipients}
						bills={bills}
						onSubmit={async (data, billData) => {
							let finalBillId = data.billId

							// Transform category field to API format
							const categoryData =
								typeof data.category === 'string'
									? { categoryId: data.category }
									: {
											newCategory: {
												name: data.category.name,
												type: data.transactionType
											}
										}

							if (billData) {
								const newBill = await new Promise<string>((resolve, reject) => {
									createBill(
										{
											...billData,
											name: data.name,
											estimatedAmount: data.amount,
											accountId: data.accountId,
											...(typeof data.category === 'string'
												? { categoryId: data.category }
												: { newCategoryName: data.category.name }),
											budgetId: budgetId,
											userId,
											lastPaymentDate: billData.lastPaymentDate ?? undefined
										},
										{
											onSuccess: (bill) => resolve(bill.id),
											onError: reject
										}
									)
								})
								finalBillId = newBill
							}

							// Transform recipient field to API format
							const recipientData = data.recipient
								? typeof data.recipient === 'string'
									? { recipientId: data.recipient }
									: { newRecipientName: data.recipient.name }
								: {}

							createTransaction({
								name: data.name,
								amount: data.amount,
								date: data.date,
								accountId: data.accountId,
								notes: data.notes,
								...categoryData,
								...recipientData,
								billId: finalBillId || undefined,
								budgetId: budgetId,
								userId
							})
						}}
						onCancel={closeDrawer}
						submitLabel="Create Transaction"
					/>
				) : (
					<div className="flex items-center justify-center p-8">
						<p className="text-muted-foreground">Loading form data...</p>
					</div>
				)}
			</div>,
			'Create Transaction'
		)
	}

	return (
		<Button
			onClick={handleClick}
			className={className}
			variant={variant}
			disabled={!budgetId}
		>
			<PlusIcon className="mr-2 h-4 w-4" />
			Add Transaction
		</Button>
	)
}
