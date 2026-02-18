/**
 * CategoryForm - Form for creating and editing categories
 */

import { useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { createZodValidator, useAppForm, validateForm } from '@/components/form'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

const createCategorySchema = (t: (key: string) => string) =>
	z.object({
		name: z.string().min(1, t('validation.categoryNameRequired')),
		types: z
			.array(z.enum(['INCOME', 'EXPENSE']))
			.min(1, t('validation.categoryTypeRequired')),
		budgetIds: z.array(z.string()).optional()
	})

type CategoryFormData = z.infer<ReturnType<typeof createCategorySchema>>

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
	submitLabel,
	budgets = []
}: CategoryFormProps) {
	const { t } = useTranslation()
	const categorySchema = useMemo(() => createCategorySchema(t), [t])
	const effectiveSubmitLabel = submitLabel ?? t('common.save')
	const incomeCheckboxId = useId()
	const expenseCheckboxId = useId()
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
						label={t('forms.categoryName')}
						placeholder={t('forms.categoryNamePlaceholder')}
					/>
				)}
			</form.AppField>

			<div className="space-y-3">
				<Label>{t('categories.type')}</Label>
				<p className="text-sm text-muted-foreground">
					{t('categories.selectCategoryType')}
				</p>
				<div className="flex gap-6">
					<div className="flex items-center space-x-2">
						<Checkbox
							id={incomeCheckboxId}
							checked={selectedTypes.includes('INCOME')}
							onCheckedChange={() => toggleType('INCOME')}
						/>
						<Label
							htmlFor={incomeCheckboxId}
							className="font-normal cursor-pointer"
						>
							{t('categories.income')}
						</Label>
					</div>
					<div className="flex items-center space-x-2">
						<Checkbox
							id={expenseCheckboxId}
							checked={selectedTypes.includes('EXPENSE')}
							onCheckedChange={() => toggleType('EXPENSE')}
						/>
						<Label
							htmlFor={expenseCheckboxId}
							className="font-normal cursor-pointer"
						>
							{t('categories.expense')}
						</Label>
					</div>
				</div>
				{selectedTypes.length === 0 && (
					<p className="text-sm text-destructive">
						{t('categories.atleastOneTypeRequired')}
					</p>
				)}
			</div>

			{/* Budget Selection */}
			{budgets.length > 0 && (
				<div className="space-y-3 pt-2">
					<Label>{t('categories.linkToBudgets')}</Label>
					<p className="text-sm text-muted-foreground">
						{t('categories.selectBudgets')}
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
					onCancel={onCancel}
					submitLabel={effectiveSubmitLabel}
				/>
			</form.AppForm>
		</form>
	)
}
