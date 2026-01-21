/**
 * CategoryForm - Form for creating and editing categories
 */

import { useState } from 'react'
import { z } from 'zod'
import { createZodValidator, useAppForm, validateForm } from '@/components/form'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

const categorySchema = z.object({
	name: z.string().min(1, 'Category name is required'),
	type: z.enum(['INCOME', 'EXPENSE'], {
		message: 'Category type is required'
	}),
	budgetIds: z.array(z.string()).optional()
})

type CategoryFormData = z.infer<typeof categorySchema>

export interface CategoryFormProps {
	/**
	 * Initial values for editing an existing category
	 */
	defaultValues?: Partial<CategoryFormData>

	/**
	 * Callback when form is submitted successfully
	 */
	onSubmit: (data: CategoryFormData) => Promise<void> | void

	/**
	 * Callback when form is cancelled
	 */
	onCancel?: () => void

	/**
	 * Submit button text
	 */
	submitLabel?: string

	/**
	 * Available budgets for linking
	 */
	budgets?: Array<{ id: string; name: string }>
}

export function CategoryForm({
	defaultValues,
	onSubmit,
	onCancel,
	submitLabel = 'Save Category',
	budgets = []
}: CategoryFormProps) {
	// All budgets selected by default for new categories
	const [selectedBudgets, setSelectedBudgets] = useState<string[]>(
		defaultValues?.budgetIds ?? budgets.map((b) => b.id)
	)

	const form = useAppForm({
		defaultValues: {
			name: defaultValues?.name ?? '',
			type: (defaultValues?.type ?? 'EXPENSE') as 'INCOME' | 'EXPENSE',
			budgetIds: defaultValues?.budgetIds ?? budgets.map((b) => b.id)
		},
		onSubmit: async ({ value }) => {
			const data = validateForm(categorySchema, {
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
			className="space-y-4"
		>
			<form.AppField
				name="name"
				validators={{
					onChange: createZodValidator(categorySchema.shape.name)
				}}
			>
				{(field) => (
					<field.TextField
						label="Category Name"
						placeholder="e.g., Groceries, Salary, Utilities"
					/>
				)}
			</form.AppField>

			<form.AppField
				name="type"
				validators={{
					onChange: createZodValidator(categorySchema.shape.type)
				}}
			>
				{(field) => (
					<field.SelectField
						label="Category Type"
						description="Is this an income or expense category?"
						options={[
							{ value: 'INCOME', label: 'Income' },
							{ value: 'EXPENSE', label: 'Expense' }
						]}
					/>
				)}
			</form.AppField>

			{/* Budget Selection */}
			{budgets.length > 0 && (
				<div className="space-y-3">
					<Label>Link to Budgets</Label>
					<p className="text-sm text-muted-foreground">
						Select which budgets should have access to this category. All
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
				<form.FormButtonGroup onCancel={onCancel} submitLabel={submitLabel} />
			</form.AppForm>
		</form>
	)
}
