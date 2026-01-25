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
	types: z
		.array(z.enum(['INCOME', 'EXPENSE']))
		.min(1, 'At least one type is required'),
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

	// Types state
	const [selectedTypes, setSelectedTypes] = useState<('INCOME' | 'EXPENSE')[]>(
		defaultValues?.types ?? ['EXPENSE']
	)

	const form = useAppForm({
		defaultValues: {
			name: defaultValues?.name ?? '',
			types: defaultValues?.types ?? (['EXPENSE'] as ('INCOME' | 'EXPENSE')[]),
			budgetIds: defaultValues?.budgetIds ?? budgets.map((b) => b.id)
		},
		onSubmit: async ({ value }) => {
			const data = validateForm(categorySchema, {
				...value,
				types: selectedTypes,
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

	const toggleType = (type: 'INCOME' | 'EXPENSE') => {
		setSelectedTypes((prev) => {
			const active = prev.includes(type)
			if (active) {
				// Prevent unselecting the last one? Or rely on validation?
				// Validation will catch empty array.
				return prev.filter((t) => t !== type)
			}
			return [...prev, type]
		})
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

			<div className="space-y-3">
				<Label>Category Type</Label>
				<p className="text-sm text-muted-foreground">
					Select if this is an income or expense category (or both).
				</p>
				<div className="flex gap-6">
					<div className="flex items-center space-x-2">
						<Checkbox
							id="type-income"
							checked={selectedTypes.includes('INCOME')}
							onCheckedChange={() => toggleType('INCOME')}
						/>
						<Label htmlFor="type-income" className="font-normal cursor-pointer">
							Income
						</Label>
					</div>
					<div className="flex items-center space-x-2">
						<Checkbox
							id="type-expense"
							checked={selectedTypes.includes('EXPENSE')}
							onCheckedChange={() => toggleType('EXPENSE')}
						/>
						<Label
							htmlFor="type-expense"
							className="font-normal cursor-pointer"
						>
							Expense
						</Label>
					</div>
				</div>
				{selectedTypes.length === 0 && (
					<p className="text-sm text-destructive">
						At least one type is required
					</p>
				)}
			</div>

			{/* Budget Selection */}
			{budgets.length > 0 && (
				<div className="space-y-3 pt-2">
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
