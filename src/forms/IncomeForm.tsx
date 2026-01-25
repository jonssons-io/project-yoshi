/**
 * IncomeForm - Form for creating and editing recurring income
 */

import { z } from 'zod'
import { createZodValidator, useAppForm, validateForm } from '@/components/form'
import { RecurrenceType } from '@/generated/prisma/enums'

// Schema for the form
const incomeSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	source: z.string().min(1, 'Source is required'),
	amount: z.number().positive('Amount must be positive'),
	expectedDate: z.date({ message: 'Date is required' }),
	accountId: z.string().min(1, 'Account is required'),
	categoryId: z.string().min(1, 'Category is required'),
	// Handle new category creation
	categoryName: z.string().optional(),
	recurrenceType: z.nativeEnum(RecurrenceType),
	customIntervalDays: z.number().optional().nullable(),
	endDate: z.date().optional().nullable()
})

type IncomeFormData = z.infer<typeof incomeSchema>

export interface IncomeFormProps {
	defaultValues?: Partial<IncomeFormData> & {
		category?: { id: string; name: string }
	}
	categories: Array<{ id: string; name: string; type: string }>
	accounts: Array<{ id: string; name: string }>
	onSubmit: (data: IncomeFormData) => Promise<void> | void
	onCancel?: () => void
	submitLabel?: string
}

export function IncomeForm({
	defaultValues,
	categories,
	accounts,
	onSubmit,
	onCancel,
	submitLabel = 'Save Income'
}: IncomeFormProps) {
	// Filter for only INCOME categories
	const incomeCategories = categories.filter((c) => c.type === 'INCOME')

	const form = useAppForm({
		defaultValues: {
			name: defaultValues?.name ?? '',
			source: defaultValues?.source ?? '',
			amount: defaultValues?.amount ?? 0,
			expectedDate: defaultValues?.expectedDate ?? new Date(),
			accountId: defaultValues?.accountId ?? '',
			categoryId: defaultValues?.categoryId ?? '',
			categoryName: defaultValues?.categoryName,
			recurrenceType: defaultValues?.recurrenceType ?? RecurrenceType.MONTHLY,
			customIntervalDays: defaultValues?.customIntervalDays,
			endDate: defaultValues?.endDate
		},
		onSubmit: async ({ value }) => {
			// If categoryId matches a known ID, use it. Otherwise assume it's a new category name?
			// The ComboboxField usually handles this by returning the value typed if allowing custom.
			// But here we'll assume the parent component handles the transformation logic if we pass raw data,
			// or we refine it here.
			// Actually, let's keep it simple: generic Combobox usually returns ID if selected, or string if typed.
			// But our ComboboxField might enforce selection.
			// Let's assume for now we select existing categories, or if we want to create new,
			// the ComboboxField needs to support create.
			// Our ComboboxField supports `onCreate` prop usually.

			const data = validateForm(incomeSchema, value)
			await onSubmit(data)
		}
	})

	const categoryOptions = incomeCategories.map((c) => ({
		value: c.id,
		label: c.name
	}))

	const accountOptions = accounts.map((a) => ({
		value: a.id,
		label: a.name
	}))

	const recurrenceOptions = Object.values(RecurrenceType).map((t) => ({
		value: t,
		label: t.charAt(0) + t.slice(1).toLowerCase() // Capitalize
	}))

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
					onChange: createZodValidator(incomeSchema.shape.name)
				}}
			>
				{(field) => (
					<field.TextField
						label="Income Name"
						placeholder="e.g. Salary, Dividend"
					/>
				)}
			</form.AppField>

			<form.AppField
				name="source"
				validators={{
					onChange: createZodValidator(incomeSchema.shape.source)
				}}
			>
				{(field) => (
					<field.TextField
						label="Source / Payer"
						placeholder="e.g. Employer Name"
					/>
				)}
			</form.AppField>

			<div className="grid grid-cols-2 gap-4">
				<form.AppField
					name="amount"
					validators={{
						onChange: createZodValidator(incomeSchema.shape.amount)
					}}
				>
					{(field) => (
						<field.NumberField
							label="Estimated Amount"
							placeholder="0.00"
							min={0}
							step="0.01"
						/>
					)}
				</form.AppField>

				<form.AppField
					name="expectedDate"
					validators={{
						onChange: createZodValidator(incomeSchema.shape.expectedDate)
					}}
				>
					{(field) => <field.DateField label="Next Expected Date" />}
				</form.AppField>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<form.AppField
					name="categoryId"
					validators={{
						onChange: createZodValidator(incomeSchema.shape.categoryId)
					}}
				>
					{(field) => (
						<field.ComboboxField
							label="Category"
							placeholder="Select category"
							options={categoryOptions}
						/>
					)}
				</form.AppField>
				{/* Note: The ComboboxField above might be tricky with "create new" because we're binding to categoryId.
             If we type a new name, it likely won't match an option value.
             Ideally, we'd have a separate handler or the Combobox supports creation by returning the string.
             For simplicity, let's assume we select existing categories or the parent handles "new" via a specific prop if needed.
             If we really need create, we might need to adjust how we pass data back.
             For now, let's stick to selecting existing categories to be safe, or if onCreate is triggered, we handle it.
        */}

				<form.AppField
					name="accountId"
					validators={{
						onChange: createZodValidator(incomeSchema.shape.accountId)
					}}
				>
					{(field) => (
						<field.SelectField
							label="Deposit Account"
							placeholder="Select account"
							options={accountOptions}
						/>
					)}
				</form.AppField>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<form.AppField
					name="recurrenceType"
					validators={{
						onChange: createZodValidator(incomeSchema.shape.recurrenceType)
					}}
				>
					{(field) => (
						<field.SelectField
							label="Recurrence"
							placeholder="Select frequency"
							options={recurrenceOptions}
						/>
					)}
				</form.AppField>

				<form.Subscribe selector={(state) => state.values.recurrenceType}>
					{(recurrenceType) =>
						recurrenceType === RecurrenceType.CUSTOM ? (
							<form.AppField
								name="customIntervalDays"
								validators={{
									onChange: createZodValidator(
										incomeSchema.shape.customIntervalDays
									)
								}}
							>
								{(field) => (
									<field.NumberField
										label="Interval (Days)"
										placeholder="e.g. 14"
										min={1}
									/>
								)}
							</form.AppField>
						) : null
					}
				</form.Subscribe>
			</div>

			<form.AppField
				name="endDate"
				validators={{
					onChange: createZodValidator(incomeSchema.shape.endDate)
				}}
			>
				{(field) => <field.DateField label="End Date (Optional)" />}
			</form.AppField>

			<form.AppForm>
				<form.FormButtonGroup onCancel={onCancel} submitLabel={submitLabel} />
			</form.AppForm>
		</form>
	)
}

export type { IncomeFormData }
