/**
 * IncomeForm - Form for creating and editing recurring income
 */

import { z } from 'zod'
import {
	type ComboboxValue,
	createZodValidator,
	useAppForm,
	validateForm
} from '@/components/form'
import { RecurrenceType } from '@/generated/prisma/enums'

// Schema for the form
const incomeSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	source: z.string().min(1, 'Source is required'),
	amount: z.number().positive('Amount must be positive'),
	expectedDate: z.date({ message: 'Date is required' }),
	accountId: z.string().min(1, 'Account is required'),
	// Handle new category creation
	category: z.union([
		z.string().min(1, { message: 'Category is required' }),
		z.object({
			isNew: z.literal(true),
			name: z.string().min(1, { message: 'Category name is required' })
		})
	]),
	recurrenceType: z.nativeEnum(RecurrenceType),
	customIntervalDays: z.number().optional().nullable(),
	endDate: z.date().optional().nullable()
})

type IncomeFormData = z.infer<typeof incomeSchema>

export interface IncomeFormProps {
	defaultValues?: Partial<IncomeFormData>
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
			category: (defaultValues?.category ?? '') as ComboboxValue,
			recurrenceType: defaultValues?.recurrenceType ?? RecurrenceType.MONTHLY,
			customIntervalDays: defaultValues?.customIntervalDays,
			endDate: defaultValues?.endDate
		},
		onSubmit: async ({ value }) => {
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
				<form.AppField name="category">
					{(field) => (
						<field.ComboboxField
							label="Category"
							placeholder="Select or create category"
							options={categoryOptions}
							allowCreate
							createLabel="Create income category"
						/>
					)}
				</form.AppField>

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
