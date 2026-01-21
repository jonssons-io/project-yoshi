/**
 * Account Form Component
 * Used for creating and editing accounts
 */

import { useState } from 'react'
import { z } from 'zod'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useAppForm } from '@/hooks/form'
import { createZodValidator, validateForm } from '@/lib/form-validation'

const accountSchema = z.object({
	name: z.string().min(1, 'Account name is required'),
	externalIdentifier: z.string().optional(),
	initialBalance: z.number().default(0),
	budgetIds: z.array(z.string()).optional()
})

type AccountFormData = z.infer<typeof accountSchema>

export interface AccountFormProps {
	/**
	 * Initial values for editing an existing account
	 */
	defaultValues?: Partial<AccountFormData>

	/**
	 * Callback when form is submitted successfully
	 */
	onSubmit: (data: AccountFormData) => Promise<void> | void

	/**
	 * Callback when form is cancelled
	 */
	onCancel?: () => void

	/**
	 * Callback when form is deleted (for edit mode)
	 */
	onDelete?: () => void

	/**
	 * Submit button text
	 */
	submitLabel?: string

	/**
	 * Available budgets for linking
	 */
	budgets?: Array<{ id: string; name: string }>
}

export function AccountForm({
	defaultValues,
	onSubmit,
	onCancel,
	onDelete,
	submitLabel = 'Save',
	budgets = []
}: AccountFormProps) {
	// All budgets selected by default for new accounts
	const [selectedBudgets, setSelectedBudgets] = useState<string[]>(
		defaultValues?.budgetIds ?? budgets.map((b) => b.id)
	)

	const form = useAppForm({
		defaultValues: {
			name: defaultValues?.name ?? '',
			externalIdentifier: defaultValues?.externalIdentifier ?? '',
			initialBalance: defaultValues?.initialBalance ?? 0,
			budgetIds: defaultValues?.budgetIds ?? budgets.map((b) => b.id)
		},
		onSubmit: async ({ value }) => {
			const data = validateForm(accountSchema, {
				...value,
				budgetIds: selectedBudgets
			})
			await onSubmit(data)
		}
	})

	const toggleBudget = (budgetId: string) => {
		setSelectedBudgets((prev) =>
			prev.includes(budgetId)
				? prev.filter((id) => id !== budgetId)
				: [...prev, budgetId]
		)
	}

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault()
				e.stopPropagation()
				form.handleSubmit()
			}}
		>
			<div className="space-y-4">
				<form.AppField
					name="name"
					validators={{
						onChange: createZodValidator(accountSchema.shape.name)
					}}
				>
					{(field) => (
						<field.TextField
							label="Account Name"
							placeholder="e.g., Checking Account, Savings"
						/>
					)}
				</form.AppField>

				<form.AppField
					name="externalIdentifier"
					validators={{
						onChange: createZodValidator(accountSchema.shape.externalIdentifier)
					}}
				>
					{(field) => (
						<field.TextField
							label="External Identifier (Optional)"
							description="Account number or external reference"
							placeholder="e.g., ****1234"
						/>
					)}
				</form.AppField>

				<form.AppField
					name="initialBalance"
					validators={{
						onChange: createZodValidator(accountSchema.shape.initialBalance)
					}}
				>
					{(field) => (
						<field.NumberField
							label="Initial Balance"
							placeholder="0.00"
							step="0.01"
							min={0}
						/>
					)}
				</form.AppField>

				{/* Budget Selection */}
				{budgets.length > 0 && (
					<div className="space-y-3">
						<Label>Link to Budgets</Label>
						<p className="text-sm text-muted-foreground">
							Select which budgets should have access to this account. All
							budgets are selected by default.
						</p>
						<div className="space-y-2">
							{budgets.map((budget) => (
								<div key={budget.id} className="flex items-center space-x-2">
									<Checkbox
										id={`budget-${budget.id}`}
										checked={selectedBudgets.includes(budget.id)}
										onCheckedChange={() => toggleBudget(budget.id)}
									/>
									<Label
										htmlFor={`budget-${budget.id}`}
										className="text-sm font-normal cursor-pointer"
									>
										{budget.name}
									</Label>
								</div>
							))}
						</div>
					</div>
				)}

				<form.AppForm>
					<form.FormButtonGroup
						onDelete={onDelete}
						onCancel={onCancel}
						submitLabel={submitLabel}
					/>
				</form.AppForm>
			</div>
		</form>
	)
}
