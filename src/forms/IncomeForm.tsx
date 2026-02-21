/**
 * IncomeForm - Form for creating and editing recurring income
 */

import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import {
	type ComboboxValue,
	createZodValidator,
	useAppForm,
	validateForm
} from '@/components/form'
import { RecurrenceType } from '@/api/generated/types.gen'

// Schema for the form
const incomeSchema = z.object({
	name: z.string().min(1, 'validation.nameRequired'),
	incomeSource: z
		.union([
			z.string().min(1),
			z.object({
				isNew: z.literal(true),
				name: z.string().min(1, 'validation.sourceRequired')
			})
		])
		.optional()
		.nullable(),
	amount: z.number().positive('validation.positive'),
	expectedDate: z.date({ message: 'validation.dateRequired' }),
	accountId: z.string().min(1, 'validation.accountRequired'),
	// Handle new category creation
	category: z.union([
		z.string().min(1, { message: 'validation.categoryRequired' }),
		z.object({
			isNew: z.literal(true),
			name: z.string().min(1, { message: 'validation.categoryNameRequired' })
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
	incomeSources?: Array<{ id: string; name: string }>
	onSubmit: (data: IncomeFormData) => Promise<void> | void
	onCancel?: () => void
	submitLabel?: string
}

export function IncomeForm({
	defaultValues,
	categories,
	accounts,
	incomeSources = [],
	onSubmit,
	onCancel,
	submitLabel
}: IncomeFormProps) {
	const { t } = useTranslation()
	const effectiveSubmitLabel = submitLabel || t('forms.saveIncome')
	// Filter for only INCOME categories
	const incomeCategories = categories.filter((c) => c.type === 'INCOME')

	const form = useAppForm({
		defaultValues: {
			name: defaultValues?.name ?? '',
			incomeSource: (defaultValues?.incomeSource ?? null) as ComboboxValue | null,
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

	const recurrenceOptions = [
		{ value: RecurrenceType.NONE, label: t('recurrence.none') },
		{ value: RecurrenceType.WEEKLY, label: t('recurrence.weekly') },
		{ value: RecurrenceType.MONTHLY, label: t('recurrence.monthly') },
		{ value: RecurrenceType.QUARTERLY, label: t('recurrence.quarterly') },
		{ value: RecurrenceType.YEARLY, label: t('recurrence.yearly') },
		{ value: RecurrenceType.CUSTOM, label: t('recurrence.custom') }
	]

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
						label={t('forms.incomeName')}
						placeholder={t('forms.incomePlaceholder')}
					/>
				)}
			</form.AppField>

			<form.AppField name="incomeSource">
				{(field) => (
					<field.ComboboxField
						label={t('forms.source')}
						placeholder={t('forms.sourcePlaceholder')}
						searchPlaceholder={t('forms.searchPlaceholder')}
						emptyText={t('forms.noMatches')}
						options={incomeSources.map((incomeSource) => ({
							value: incomeSource.id,
							label: incomeSource.name
						}))}
						allowCreate
						createLabel={t('forms.source')}
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
							label={t('forms.estimatedAmount')}
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
					{(field) => <field.DateField label={t('forms.nextExpectedDate')} />}
				</form.AppField>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<form.AppField name="category">
					{(field) => (
						<field.ComboboxField
							label={t('common.category')}
							placeholder={t('forms.selectCategory')}
							options={categoryOptions}
							allowCreate
							createLabel={t('forms.createIncomeCategory')}
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
							label={t('forms.depositAccount')}
							placeholder={t('forms.selectAccount')}
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
							label={t('recurrence.label')}
							placeholder={t('forms.selectFrequency')}
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
										label={t('forms.intervalDays')}
										placeholder={t('forms.intervalPlaceholder')}
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
				{(field) => <field.DateField label={t('forms.endDate')} />}
			</form.AppField>

			<form.AppForm>
				<form.FormButtonGroup
					onCancel={onCancel}
					submitLabel={effectiveSubmitLabel}
				/>
			</form.AppForm>
		</form>
	)
}

export type { IncomeFormData }
