/**
 * BillForm - Form for creating and editing bills
 *
 * Features:
 * - Category selection with inline creation via ComboboxField
 * - Only EXPENSE categories are shown (bills are always expenses)
 */

import { z } from 'zod'
import {
	type ComboboxValue,
	createZodValidator,
	useAppForm,
	validateForm
} from '@/components/form'
import { RecurrenceType } from '@/api/generated/types.gen'

// Schema for bill form - categoryId is handled via ComboboxValue
// Schema for bill form - categoryId is handled via ComboboxValue
const createBillSchema = (t: (key: string) => string) =>
	z.object({
		name: z.string().min(1, { message: t('validation.nameRequired') }),
		// Recipient can be string (ID) or new object
		recipient: z.union([
			z.string().min(1, { message: t('validation.recipientRequired') }),
			z.object({
				isNew: z.literal(true),
				name: z
					.string()
					.min(1, { message: t('validation.recipientNameRequired') })
			})
		]),
		accountId: z.string().min(1, { message: t('validation.accountRequired') }),
		startDate: z.date({ message: t('validation.dateRequired') }),
		recurrenceType: z.enum(
			[
				RecurrenceType.NONE,
				RecurrenceType.WEEKLY,
				RecurrenceType.MONTHLY,
				RecurrenceType.QUARTERLY,
				RecurrenceType.YEARLY,
				RecurrenceType.CUSTOM
			],
			{ message: t('validation.recurrenceTypeRequired') }
		),
		customIntervalDays: z.number().int().positive().optional(),
		lastPaymentDate: z.date().optional().nullable(),

		// Splits
		splits: z
			.array(
				z.object({
					id: z.string(),
					subtitle: z.string().min(1, t('validation.subtitleRequired')),
					amount: z.number().positive(t('validation.positive')),
					// Category logic same as before but per split
					category: z.union([
						z.string().min(1, { message: t('validation.categoryRequired') }),
						z.object({
							isNew: z.literal(true),
							name: z
								.string()
								.min(1, { message: t('validation.categoryNameRequired') })
						})
					])
				})
			)
			.min(1, t('validation.minOneSection'))
	})

export type BillFormData = z.infer<ReturnType<typeof createBillSchema>>

interface BillFormProps {
	initialData?: {
		name?: string
		recipient?: string
		accountId?: string
		startDate?: Date
		recurrenceType?: RecurrenceType
		customIntervalDays?: number
		estimatedAmount?: number
		lastPaymentDate?: Date | null
		categoryId?: string
		splits?: Array<{
			id?: string
			subtitle: string
			amount: number
			categoryId: string
		}>
	}
	onSubmit: (data: BillFormData) => void
	onCancel: () => void
	accounts: Array<{ id: string; name: string }>
	// Categories should already be filtered to EXPENSE type by the parent component
	categories: Array<{ id: string; name: string }>
	recipients: Array<{ id: string; name: string }>
	isSubmitting?: boolean
}

import { Plus, Trash2 } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export function BillForm({
	initialData,
	onSubmit,
	onCancel,
	accounts,
	categories,
	recipients,
	isSubmitting
}: BillFormProps) {
	const { t } = useTranslation()
	const billSchema = useMemo(() => createBillSchema(t), [t])

	const recurrenceOptions = useMemo(
		() => [
			{ value: RecurrenceType.NONE, label: t('recurrence.none') },
			{ value: RecurrenceType.WEEKLY, label: t('recurrence.weekly') },
			{ value: RecurrenceType.MONTHLY, label: t('recurrence.monthly') },
			{
				value: RecurrenceType.QUARTERLY,
				label: t('recurrence.quarterly')
			},
			{ value: RecurrenceType.YEARLY, label: t('recurrence.yearly') },
			{ value: RecurrenceType.CUSTOM, label: t('recurrence.custom') }
		],
		[t]
	)

	const splitBillSwitchId = useId()
	// Prepare initial splits
	const initialSplits =
		initialData?.splits && initialData.splits.length > 0
			? initialData.splits.map((s) => ({
					id: s.id ?? crypto.randomUUID(),
					subtitle: s.subtitle,
					amount: s.amount,
					category: s.categoryId as ComboboxValue
				}))
			: [
					{
						id: crypto.randomUUID(),
						subtitle: t('forms.splitBillDefaultName'),
						amount: initialData?.estimatedAmount ?? 0,
						category: (initialData?.categoryId ?? '') as ComboboxValue
					}
				]

	const [isSplit, setIsSplit] = useState((initialData?.splits?.length ?? 0) > 1)

	const form = useAppForm({
		defaultValues: {
			name: initialData?.name ?? '',
			recipient: (() => {
				const initialName = initialData?.recipient
				if (!initialName) return ''
				const match = recipients.find((r) => r.name === initialName)
				return (
					match ? match.id : { isNew: true, name: initialName }
				) as ComboboxValue
			})(),
			accountId: initialData?.accountId ?? '',
			startDate: initialData?.startDate ?? new Date(),
			recurrenceType: initialData?.recurrenceType ?? RecurrenceType.MONTHLY,
			customIntervalDays: initialData?.customIntervalDays ?? undefined,
			lastPaymentDate: initialData?.lastPaymentDate ?? null,
			splits: initialSplits
		},
		onSubmit: async ({ value }) => {
			const data = validateForm(billSchema, value)
			const estimatedAmount = data.splits.reduce((sum, s) => sum + s.amount, 0)
			await onSubmit({
				...data,
				estimatedAmount
			} as BillFormData)
		}
	})

	// Create category options for ComboboxField
	const categoryOptions = categories.map((category) => ({
		value: category.id,
		label: category.name
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
					onChange: createZodValidator(billSchema.shape.name)
				}}
			>
				{(field) => (
					<field.TextField
						label={t('common.title')}
						placeholder={t('forms.billNamePlaceholder')}
					/>
				)}
			</form.AppField>

			<form.AppField name="recipient">
				{(field) => (
					<field.ComboboxField
						label={t('common.recipient')}
						placeholder={t('forms.selectOrCreateRecipient')}
						searchPlaceholder={t('forms.searchRecipient')}
						emptyText={t('forms.noRecipientsFound')}
						options={recipients.map((r) => ({
							value: r.id,
							label: r.name
						}))}
						allowCreate
						createLabel={t('forms.addRecipient')}
					/>
				)}
			</form.AppField>

			<form.AppField
				name="accountId"
				validators={{
					onChange: createZodValidator(billSchema.shape.accountId)
				}}
			>
				{(field) => (
					<field.SelectField
						label={t('common.account')}
						placeholder={t('forms.selectAccount')}
						options={accounts.map((account) => ({
							value: account.id,
							label: account.name
						}))}
					/>
				)}
			</form.AppField>

			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-2">
						<Switch
							id={splitBillSwitchId}
							checked={isSplit}
							onCheckedChange={(checked) => {
								if (!checked && form.getFieldValue('splits').length > 1) {
									if (!confirm(t('forms.disableSplitBill'))) {
										return
									}
									// Reset to single split
									const firstSplit = form.getFieldValue('splits')[0]
									form.setFieldValue('splits', [firstSplit])
								}
								setIsSplit(checked)
							}}
						/>
						<Label htmlFor={splitBillSwitchId}>{t('forms.splitBill')}</Label>
					</div>
					{isSplit && (
						<form.Subscribe selector={(state) => state.values.splits}>
							{(splits) => (
								<span className="text-sm text-muted-foreground font-medium">
									{`${t('common.total')}: `}
									{new Intl.NumberFormat('en-US', {
										style: 'currency',
										currency: 'SEK'
									}).format(
										splits.reduce((sum, s) => sum + (s.amount || 0), 0)
									)}
								</span>
							)}
						</form.Subscribe>
					)}
				</div>

				<form.Field name="splits" mode="array">
					{(field) => (
						<div className="space-y-3">
							{!isSplit ? (
								// Simple Mode: Single Split
								<div className="space-y-4">
									<form.AppField
										name="splits[0].amount"
										validators={{
											onChange: createZodValidator(
												z.number().positive(t('validation.positive'))
											)
										}}
									>
										{(amtField) => (
											<amtField.NumberField
												label={t('common.amount')}
												min={0}
												step="1"
											/>
										)}
									</form.AppField>

									<form.AppField
										name="splits[0].category"
										validators={{
											onChange: createZodValidator(
												z.union([
													z.string().min(1, t('validation.categoryRequired')),
													z.object({
														isNew: z.literal(true),
														name: z
															.string()
															.min(1, t('validation.categoryNameRequired'))
													})
												])
											)
										}}
									>
										{(catField) => (
											<catField.ComboboxField
												label={t('common.category')}
												placeholder={t('forms.selectCategory')}
												options={categoryOptions}
												allowCreate
												createLabel={t('categories.create')}
											/>
										)}
									</form.AppField>
								</div>
							) : (
								// Split Mode: Multiple Sections
								<>
									{field.state.value.map((split, index) => (
										<Card key={split.id} className="bg-muted/30">
											<CardContent className="p-3 space-y-3">
												<div className="flex gap-2">
													<div className="flex-1">
														<form.AppField
															name={`splits[${index}].subtitle`}
															validators={{
																onChange: createZodValidator(
																	z.string().min(1, t('validation.required'))
																)
															}}
														>
															{(subField) => (
																<subField.TextField
																	label={t('forms.splitBillSubtitle')}
																	placeholder={t(
																		'forms.splitBillNamePlaceholder'
																	)}
																/>
															)}
														</form.AppField>
													</div>
													<div className="w-32">
														<form.AppField
															name={`splits[${index}].amount`}
															validators={{
																onChange: createZodValidator(
																	z.number().positive(t('validation.positive'))
																)
															}}
														>
															{(amtField) => (
																<amtField.NumberField
																	label={t('common.amount')}
																	min={0}
																	step="1"
																/>
															)}
														</form.AppField>
													</div>
													<div className="pt-2">
														{field.state.value.length > 1 && (
															<Button
																type="button"
																variant="ghost"
																size="icon"
																className={index === 0 ? 'mt-6' : ''}
																onClick={() => field.removeValue(index)}
																title={t('forms.splitBillRemoveSection')}
															>
																<Trash2 className="h-4 w-4 text-destructive" />
															</Button>
														)}
													</div>
												</div>

												<form.AppField
													name={`splits[${index}].category`}
													validators={{
														onChange: createZodValidator(
															z.union([
																z.string().min(1, t('validation.required')),
																z.object({
																	isNew: z.literal(true),
																	name: z
																		.string()
																		.min(1, t('validation.required'))
																})
															])
														)
													}}
												>
													{(catField) => (
														<catField.ComboboxField
															label={t('common.category')}
															placeholder={t('forms.selectCategory')}
															options={categoryOptions}
															allowCreate
															createLabel={t('categories.create')}
														/>
													)}
												</form.AppField>
											</CardContent>
										</Card>
									))}
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() =>
											field.pushValue({
												id: crypto.randomUUID(),
												subtitle: '',
												amount: 0,
												category: ''
											})
										}
										className="w-full border-dashed"
									>
										<Plus className="h-4 w-4 mr-2" />
										{t('forms.splitBillAddSection')}
									</Button>
								</>
							)}
						</div>
					)}
				</form.Field>
			</div>

			<form.AppField
				name="startDate"
				validators={{
					onChange: createZodValidator(billSchema.shape.startDate)
				}}
			>
				{(field) => (
					<field.DateField label={t('forms.startDateFirstPayment')} />
				)}
			</form.AppField>

			<form.AppField
				name="recurrenceType"
				validators={{
					onChange: createZodValidator(billSchema.shape.recurrenceType)
				}}
			>
				{(field) => (
					<field.SelectField
						label={t('recurrence.label')}
						placeholder={t('forms.selectRecurrence')}
						options={recurrenceOptions}
					/>
				)}
			</form.AppField>

			<form.Subscribe selector={(state) => state.values.recurrenceType}>
				{(recurrenceType) => (
					<>
						{recurrenceType === RecurrenceType.CUSTOM && (
							<form.AppField
								name="customIntervalDays"
								validators={{
									onChange: createZodValidator(
										billSchema.shape.customIntervalDays
									)
								}}
							>
								{(field) => (
									<field.NumberField
										label={t('forms.daysBetweenPayments')}
										placeholder={t('forms.daysExample')}
										min={1}
									/>
								)}
							</form.AppField>
						)}
					</>
				)}
			</form.Subscribe>

			<form.AppField
				name="lastPaymentDate"
				validators={{
					onChange: createZodValidator(billSchema.shape.lastPaymentDate)
				}}
			>
				{(field) => (
					<field.DateField
						label={t('forms.lastPaymentDateOptional')}
						description={t('forms.lastPaymentDateDesc')}
					/>
				)}
			</form.AppField>

			<form.AppForm>
				<form.FormButtonGroup
					onCancel={onCancel}
					submitLabel={
						isSubmitting
							? t('common.saving')
							: initialData
								? t('bills.update')
								: t('bills.create')
					}
				/>
			</form.AppForm>
		</form>
	)
}
