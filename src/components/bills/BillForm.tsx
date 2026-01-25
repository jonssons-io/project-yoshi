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
import { RecurrenceType } from '@/generated/prisma/enums'

// Schema for bill form - categoryId is handled via ComboboxValue
const billSchema = z.object({
	name: z.string().min(1, { message: 'Name is required' }),
	// Recipient can be string (ID) or new object
	recipient: z.union([
		z.string().min(1, { message: 'Recipient is required' }),
		z.object({
			isNew: z.literal(true),
			name: z.string().min(1, { message: 'Recipient name is required' })
		})
	]),
	accountId: z.string().min(1, { message: 'Account is required' }),
	startDate: z.date({ message: 'Start date is required' }),
	recurrenceType: z.enum(
		[
			RecurrenceType.NONE,
			RecurrenceType.WEEKLY,
			RecurrenceType.MONTHLY,
			RecurrenceType.QUARTERLY,
			RecurrenceType.YEARLY,
			RecurrenceType.CUSTOM
		],
		{ message: 'Recurrence type is required' }
	),
	customIntervalDays: z.number().int().positive().optional(),
	lastPaymentDate: z.date().optional().nullable(),

	// Splits
	splits: z
		.array(
			z.object({
				subtitle: z.string().min(1, 'Subtitle is required'),
				amount: z.number().positive('Amount must be positive'),
				// Category logic same as before but per split
				category: z.union([
					z.string().min(1, { message: 'Category is required' }),
					z.object({
						isNew: z.literal(true),
						name: z.string().min(1, { message: 'Category name is required' })
					})
				])
			})
		)
		.min(1, 'At least one section is required')
})

export type BillFormData = z.infer<typeof billSchema>

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

const recurrenceOptions = [
	{ value: RecurrenceType.NONE, label: 'No recurrence (one-time)' },
	{ value: RecurrenceType.WEEKLY, label: 'Weekly' },
	{ value: RecurrenceType.MONTHLY, label: 'Monthly' },
	{ value: RecurrenceType.QUARTERLY, label: 'Quarterly (every 3 months)' },
	{ value: RecurrenceType.YEARLY, label: 'Yearly' },
	{ value: RecurrenceType.CUSTOM, label: 'Custom interval' }
]

import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
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
	// Prepare initial splits
	const initialSplits =
		initialData?.splits && initialData.splits.length > 0
			? initialData.splits.map((s) => ({
					subtitle: s.subtitle,
					amount: s.amount,
					category: s.categoryId as ComboboxValue
				}))
			: [
					{
						subtitle: 'Main',
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
					<field.TextField label="Bill Name" placeholder="e.g. Electricity" />
				)}
			</form.AppField>

			<form.AppField name="recipient">
				{(field) => (
					<field.ComboboxField
						label="Recipient"
						placeholder="Select or create recipient"
						searchPlaceholder="Search recipients..."
						emptyText="No recipients found"
						options={recipients.map((r) => ({
							value: r.id,
							label: r.name
						}))}
						allowCreate
						createLabel="Create recipient"
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
						label="Account"
						placeholder="Select account"
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
							id="split-mode"
							checked={isSplit}
							onCheckedChange={(checked) => {
								if (!checked && form.getFieldValue('splits').length > 1) {
									if (
										!confirm(
											'Disabling split mode will remove additional sections. Continue?'
										)
									) {
										return
									}
									// Reset to single split
									const firstSplit = form.getFieldValue('splits')[0]
									form.setFieldValue('splits', [firstSplit])
								}
								setIsSplit(checked)
							}}
						/>
						<Label htmlFor="split-mode">Split this bill</Label>
					</div>
					{isSplit && (
						<form.Subscribe selector={(state) => state.values.splits}>
							{(splits) => (
								<span className="text-sm text-muted-foreground font-medium">
									Total:{' '}
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
											onChange: createZodValidator(z.number().positive())
										}}
									>
										{(amtField) => (
											<amtField.NumberField
												label="Amount"
												placeholder="0.00"
												min={0}
												step="0.01"
											/>
										)}
									</form.AppField>

									<form.AppField
										name="splits[0].category"
										validators={{
											onChange: createZodValidator(
												z.union([
													z.string().min(1, 'Category is required'),
													z.object({
														isNew: z.literal(true),
														name: z.string().min(1, 'Category name is required')
													})
												])
											)
										}}
									>
										{(catField) => (
											<catField.ComboboxField
												label="Category"
												placeholder="Select category"
												options={categoryOptions}
												allowCreate
												createLabel="Create expense category"
											/>
										)}
									</form.AppField>
								</div>
							) : (
								// Split Mode: Multiple Sections
								<>
									{field.state.value.map((_, index) => (
										<Card key={index} className="bg-muted/30">
											<CardContent className="p-3 space-y-3">
												<div className="flex gap-2">
													<div className="flex-1">
														<form.AppField
															name={`splits[${index}].subtitle`}
															validators={{
																onChange: createZodValidator(
																	z.string().min(1, 'Required')
																)
															}}
														>
															{(subField) => (
																<subField.TextField
																	label={index === 0 ? 'Subtitle' : ''}
																	placeholder="e.g. Interest"
																/>
															)}
														</form.AppField>
													</div>
													<div className="w-32">
														<form.AppField
															name={`splits[${index}].amount`}
															validators={{
																onChange: createZodValidator(
																	z.number().positive()
																)
															}}
														>
															{(amtField) => (
																<amtField.NumberField
																	label={index === 0 ? 'Amount' : ''}
																	placeholder="0.00"
																	min={0}
																	step="0.01"
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
																title="Remove section"
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
																z.string().min(1, 'Category is required'),
																z.object({
																	isNew: z.literal(true),
																	name: z
																		.string()
																		.min(1, 'Category name is required')
																})
															])
														)
													}}
												>
													{(catField) => (
														<catField.ComboboxField
															label={index === 0 ? 'Category' : ''}
															placeholder="Select category"
															options={categoryOptions}
															allowCreate
															createLabel="Create expense category"
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
												subtitle: '',
												amount: 0,
												category: ''
											})
										}
										className="w-full border-dashed"
									>
										<Plus className="h-4 w-4 mr-2" />
										Add Section
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
				{(field) => <field.DateField label="Start Date (First Payment)" />}
			</form.AppField>

			<form.AppField
				name="recurrenceType"
				validators={{
					onChange: createZodValidator(billSchema.shape.recurrenceType)
				}}
			>
				{(field) => (
					<field.SelectField
						label="Recurrence"
						placeholder="Select recurrence"
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
										label="Days Between Payments"
										placeholder="e.g. 30"
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
						label="Last Payment Date (Optional)"
						description="For bills that will end (e.g. loan payoff date)"
					/>
				)}
			</form.AppField>

			<form.AppForm>
				<form.FormButtonGroup
					onCancel={onCancel}
					submitLabel={
						isSubmitting
							? 'Saving...'
							: initialData
								? 'Update Bill'
								: 'Create Bill'
					}
				/>
			</form.AppForm>
		</form>
	)
}
