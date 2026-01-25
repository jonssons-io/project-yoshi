/**
 * TransactionForm - Form for creating and editing transactions
 *
 * Features:
 * - Income/Expense type selector
 * - Category filtering based on transaction type
 * - Inline category creation via ComboboxField
 * - Split transaction support for expenses
 */

import type { inferRouterOutputs } from '@trpc/server'
import { AlertTriangleIcon, Plus, Trash2 } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { z } from 'zod'
import {
	type ComboboxValue,
	createZodValidator,
	useAppForm,
	validateForm
} from '@/components/form'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { RecurrenceType } from '@/generated/prisma/enums'
import type { TRPCRouter } from '@/integrations/trpc/router'

type RouterOutputs = inferRouterOutputs<TRPCRouter>
type BudgetWithDetails = RouterOutputs['budgets']['list'][number]

// Schema with discriminated category field
const transactionSchema = z
	.object({
		name: z.string().min(1, { message: 'Transaction name is required' }),
		amount: z.number().positive({ message: 'Amount must be positive' }),
		date: z.date({ message: 'Date is required' }),
		transactionType: z.enum(['INCOME', 'EXPENSE']),
		// Category can be either an existing ID or a new category to create
		category: z
			.union([
				z.string().min(1, { message: 'Category is required' }),
				z.object({
					isNew: z.literal(true),
					name: z.string().min(1, { message: 'Category name is required' })
				})
			])
			.optional(), // Optional now because of splits
		accountId: z.string().min(1, { message: 'Account is required' }),
		// Recipient/Sender is optional - can be ID or new name
		recipient: z
			.union([
				z.string().min(1),
				z.object({
					isNew: z.literal(true),
					name: z.string().min(1)
				})
			])
			.nullable()
			.optional(),
		notes: z.string().optional(),
		// billId uses "__none__" as sentinel for no selection (Select requires non-empty values)
		billId: z.string().optional().nullable(),
		budgetId: z.string().optional(),
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
			.optional()
	})
	.refine(
		(data) => {
			// If splits IS present and has length, category is optional at top level
			// If splits IS NOT present (or empty), category is required at top level
			if (
				data.transactionType === 'EXPENSE' &&
				data.splits &&
				data.splits.length > 0
			) {
				return true
			}
			if (data.category) return true
			return false
		},
		{
			message: 'Category is required',
			path: ['category']
		}
	)

// Sentinel value for "no bill" selection (shadcn Select requires non-empty values)
const NO_BILL_VALUE = '__none__'

type TransactionFormData = z.infer<typeof transactionSchema>

export interface BillCreationData {
	recipient: string
	startDate: Date
	recurrenceType: RecurrenceType
	customIntervalDays?: number
	lastPaymentDate?: Date | null
}

export interface TransactionFormProps {
	/**
	 * Initial values for editing an existing transaction
	 */
	defaultValues?: {
		name?: string
		amount?: number
		date?: Date
		categoryId?: string
		budgetId?: string
		accountId?: string
		recipientId?: string | null
		recipient?: ComboboxValue | null // allow passing full object
		notes?: string
		billId?: string | null
		transactionType?: 'INCOME' | 'EXPENSE'
		splits?: Array<{
			subtitle: string
			amount: number
			categoryId: string
		}>
	}

	/**
	 * Available categories (all types - will be filtered by form)
	 */
	categories: Array<{ id: string; name: string; types: string[] }>

	/**
	 * Available accounts
	 */
	accounts: Array<{ id: string; name: string }>

	/**
	 * Available budgets for overdraft check
	 */
	budgets?: BudgetWithDetails[]

	/**
	 * Available recipients (for both expense recipients and income senders)
	 */
	recipients?: Array<{ id: string; name: string }>

	/**
	 * Available bills (for linking)
	 */
	bills?: Array<{ id: string; name: string; recipient: string }>

	/**
	 * Pre-selected bill (from "Create Transaction" button on bills page)
	 */
	preSelectedBillId?: string

	/**
	 * Callback when form is submitted successfully
	 * @param data - Form data including category (ID or new object)
	 * @param billData - Optional bill creation data
	 */
	onSubmit: (
		data: TransactionFormData,
		billData?: BillCreationData
	) => Promise<void> | void

	/**
	 * Callback when form is cancelled
	 */
	onCancel?: () => void

	/**
	 * Submit button text
	 */
	submitLabel?: string

	/**
	 * Is this for editing an existing transaction?
	 */
	isEditing?: boolean

	/**
	 * Original bill amount for diff comparison
	 */
	originalBillAmount?: number
}

const recurrenceOptions = [
	{ value: RecurrenceType.NONE, label: 'No recurrence (one-time)' },
	{ value: RecurrenceType.WEEKLY, label: 'Weekly' },
	{ value: RecurrenceType.MONTHLY, label: 'Monthly' },
	{ value: RecurrenceType.QUARTERLY, label: 'Quarterly (every 3 months)' },
	{ value: RecurrenceType.YEARLY, label: 'Yearly' },
	{ value: RecurrenceType.CUSTOM, label: 'Custom interval' }
]

const transactionTypeOptions = [
	{ value: 'EXPENSE', label: 'Expense' },
	{ value: 'INCOME', label: 'Income' }
]

export function TransactionForm({
	defaultValues,
	categories,
	accounts,
	budgets,
	recipients = [],
	bills = [],
	preSelectedBillId,
	originalBillAmount,
	onSubmit,
	onCancel,
	submitLabel = 'Save Transaction',
	isEditing = false
}: TransactionFormProps) {
	// Generate unique ID for the checkbox
	const createBillCheckboxId = useId()

	// Bill creation state (separate from form)
	const [createBill, setCreateBill] = useState(false)
	const [billRecipient, setBillRecipient] = useState('')
	const [billStartDate, setBillStartDate] = useState<Date>(new Date())
	const [billRecurrence, setBillRecurrence] = useState<RecurrenceType>(
		RecurrenceType.MONTHLY
	)
	const [billCustomDays, setBillCustomDays] = useState<number | undefined>(
		undefined
	)
	const [billLastPayment, setBillLastPayment] = useState<Date | null>(null)

	// Splits toggle state
	const [useSplits, setUseSplits] = useState(
		!!(defaultValues?.splits && defaultValues.splits.length > 0)
	)

	// Determine initial transaction type based on default category
	const getInitialTransactionType = (): 'INCOME' | 'EXPENSE' => {
		if (defaultValues?.transactionType) {
			return defaultValues.transactionType
		}
		if (defaultValues?.categoryId) {
			const category = categories.find((c) => c.id === defaultValues.categoryId)
			if (category) {
				// Default to matching type, or fallback to first type
				if (category.types.includes('EXPENSE')) return 'EXPENSE'
				if (category.types.includes('INCOME')) return 'INCOME'
			}
		}
		return 'EXPENSE' // Default to expense
	}

	const form = useAppForm({
		defaultValues: {
			name: defaultValues?.name ?? '',
			amount: defaultValues?.amount ?? 0,
			date: defaultValues?.date ?? new Date(),
			transactionType: getInitialTransactionType(),
			category: (defaultValues?.categoryId ?? '') as ComboboxValue,
			accountId: defaultValues?.accountId ?? '',
			recipient: (defaultValues?.recipient ??
				defaultValues?.recipientId ??
				null) as ComboboxValue | null,
			notes: defaultValues?.notes ?? '',
			billId: preSelectedBillId ?? defaultValues?.billId ?? null,
			budgetId: defaultValues?.budgetId ?? '',
			splits:
				defaultValues?.splits && defaultValues.splits.length > 0
					? defaultValues.splits.map((s) => ({
							subtitle: s.subtitle,
							amount: s.amount,
							category: s.categoryId as ComboboxValue
						}))
					: undefined
		},
		onSubmit: async ({ value }) => {
			// Transform __none__ sentinel back to null for billId
			const transformedValue = {
				...value,
				billId: value.billId === NO_BILL_VALUE ? null : value.billId
			}

			// Validate form
			// If useSplits is false, ensure splits array is empty in data to avoid validation confusion or backend issues
			if (!useSplits) {
				transformedValue.splits = undefined
			} else {
				// If splits are used, category is undefined
				transformedValue.category = undefined
			}

			const data = validateForm(transactionSchema, transformedValue)

			const billData = createBill
				? {
						recipient: billRecipient,
						startDate: billStartDate,
						recurrenceType: billRecurrence,
						customIntervalDays: billCustomDays,
						lastPaymentDate: billLastPayment
					}
				: undefined

			await onSubmit(data, billData)
		}
	})

	// Handle transaction type change
	const handleTransactionTypeChange = (newType: string) => {
		const currentCategory = form.getFieldValue('category')
		if (typeof currentCategory === 'string' && currentCategory) {
			const cat = categories.find((c) => c.id === currentCategory)
			if (cat && !cat.types.includes(newType)) {
				form.setFieldValue('category', '')
			}
		}
		// Disable splits if Income (simplified for now, unless income splits are desired)
		if (newType === 'INCOME') {
			setUseSplits(false)
		}
	}

	// Component to sync amount with splits total
	function AmountSyncLogic({
		splits,
		amount,
		type
	}: {
		splits: any[] | undefined
		amount: number
		type: string
	}) {
		useEffect(() => {
			if (type === 'EXPENSE' && useSplits && splits) {
				const total = splits.reduce((sum, s) => sum + (s.amount || 0), 0)
				// Prevent infinite loop by checking difference
				if (Math.abs(total - amount) > 0.001) {
					form.setFieldValue('amount', Number(total.toFixed(2)))
				}
			}
		}, [splits, amount, type])
		return null
	}

	function AmountSync() {
		return (
			<form.Subscribe
				selector={(state) => ({
					splits: state.values.splits,
					amount: state.values.amount,
					type: state.values.transactionType
				})}
			>
				{(values) => <AmountSyncLogic {...values} />}
			</form.Subscribe>
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
			<AmountSync />
			{/* Transaction Type Selector */}
			<form.AppField name="transactionType">
				{(field) => (
					<field.RadioGroupField
						label="Transaction Type"
						options={transactionTypeOptions}
						onValueChange={handleTransactionTypeChange}
					/>
				)}
			</form.AppField>

			<form.AppField
				name="name"
				validators={{
					onChange: createZodValidator(transactionSchema.shape.name)
				}}
			>
				{(field) => (
					<field.TextField
						label="Transaction Name"
						placeholder="e.g., Grocery shopping, Salary payment"
					/>
				)}
			</form.AppField>

			<form.AppField
				name="amount"
				validators={{
					onChange: createZodValidator(transactionSchema.shape.amount)
				}}
			>
				{(field) => (
					<field.NumberField
						label="Amount"
						placeholder="0.00"
						step="0.01"
						min={0}
					/>
				)}
			</form.AppField>

			<form.AppField
				name="date"
				validators={{
					onChange: createZodValidator(transactionSchema.shape.date)
				}}
			>
				{(field) => <field.DateField label="Date" />}
			</form.AppField>

			{/* Check for Overdraft */}
			<form.Subscribe
				selector={(state) => [
					state.values.budgetId,
					state.values.amount,
					state.values.transactionType
				]}
			>
				{([budgetId, amount, transactionType]) => {
					if (!budgets || !budgetId || transactionType !== 'EXPENSE')
						return null
					const budget = budgets.find((b) => b.id === budgetId)
					if (!budget) return null

					// biome-ignore lint/suspicious/noExplicitAny: RouterOutputs type complexity
					const remaining = (budget as any).remainingAmount ?? 0
					const willOverdraft = remaining - (amount || 0) < 0

					return (
						<div className="space-y-2">
							<div className="text-sm">
								<span className="text-muted-foreground">
									Remaining in {budget.name}:{' '}
								</span>
								<span
									className={
										remaining < 0 ? 'text-red-500 font-bold' : 'font-bold'
									}
								>
									{new Intl.NumberFormat('en-US', {
										style: 'currency',
										currency: 'SEK'
									}).format(remaining)}
								</span>
							</div>
							{willOverdraft && (
								<Alert variant="destructive" className="py-2">
									<AlertTriangleIcon className="h-4 w-4" />
									<AlertTitle>Overdraft Warning</AlertTitle>
									<AlertDescription>
										This transaction exceeds the remaining allocated funds by{' '}
										{new Intl.NumberFormat('en-US', {
											style: 'currency',
											currency: 'SEK'
										}).format(Math.abs(remaining - (amount || 0)))}
										.
									</AlertDescription>
								</Alert>
							)}
						</div>
					)
				}}
			</form.Subscribe>

			{budgets && budgets.length > 0 && (
				<form.AppField
					name="budgetId"
					validators={{
						onChange: createZodValidator(transactionSchema.shape.budgetId)
					}}
				>
					{(field) => (
						<field.SelectField
							label="Budget (Optional)"
							placeholder="Select a budget"
							options={budgets.map((b) => ({
								value: b.id,
								label: b.name
							}))}
						/>
					)}
				</form.AppField>
			)}

			{/* Split Transaction Toggle */}
			<form.Subscribe selector={(state) => state.values.transactionType}>
				{(transactionType) =>
					transactionType === 'EXPENSE' && (
						<div className="flex items-center space-x-2 pb-2">
							<Switch
								id="useSplits"
								checked={useSplits}
								onCheckedChange={(checked) => {
									if (
										!checked &&
										(form.getFieldValue('splits') || []).length > 1
									) {
										if (
											!confirm(
												'Disabling split mode will remove additional sections. Continue?'
											)
										) {
											return
										}
										// Reset to single split (optional, or just let validatForm handle it?
										// form.setFieldValue('splits', [form.getFieldValue('splits')[0]])
									}
									setUseSplits(checked)
								}}
							/>
							<Label htmlFor="useSplits" className="cursor-pointer">
								Split this transaction (multiple categories)
							</Label>
						</div>
					)
				}
			</form.Subscribe>

			{/* Category Combobox OR Splits Editor */}
			{!useSplits ? (
				<form.Subscribe selector={(state) => state.values.transactionType}>
					{(transactionType) => {
						// Filter categories based on selected transaction type
						const filteredCategories = categories.filter((cat) =>
							cat.types.includes(transactionType)
						)

						// Create options for the ComboboxField
						const categoryOptions = filteredCategories.map((cat) => ({
							value: cat.id,
							label: cat.name
						}))

						return (
							<form.AppField name="category">
								{(field) => (
									<field.ComboboxField
										label="Category"
										placeholder="Select or create a category"
										searchPlaceholder="Search categories..."
										emptyText="No categories found"
										options={categoryOptions}
										allowCreate
										createLabel={`Create ${transactionType === 'INCOME' ? 'income' : 'expense'} category`}
									/>
								)}
							</form.AppField>
						)
					}}
				</form.Subscribe>
			) : (
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h3 className="text-sm font-medium">Sections</h3>
						<form.Subscribe selector={(state) => state.values.splits}>
							{(splits) => {
								const totalSplits =
									splits?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0
								const totalDiff = totalSplits - form.getFieldValue('amount')
								const isZeroDiff = Math.abs(totalDiff) < 0.01

								return (
									<div className="flex flex-col items-end">
										<span
											className={`text-sm font-medium ${
												!isZeroDiff ? 'text-red-500' : 'text-green-600'
											}`}
										>
											Total:{' '}
											{new Intl.NumberFormat('en-US', {
												style: 'currency',
												currency: 'SEK'
											}).format(totalSplits)}
											{/* {!isZeroDiff &&
												` (Diff: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SEK' }).format(totalDiff)})`} */}
										</span>
										{originalBillAmount !== undefined && (
											<span className="text-xs text-muted-foreground">
												Bill Amount:{' '}
												{new Intl.NumberFormat('en-US', {
													style: 'currency',
													currency: 'SEK'
												}).format(originalBillAmount)}
												{Math.abs(totalSplits - originalBillAmount) > 0.001 && (
													<span
														className={
															totalSplits > originalBillAmount
																? 'text-red-500 ml-1'
																: 'text-green-600 ml-1'
														}
													>
														({totalSplits > originalBillAmount ? '+' : ''}
														{new Intl.NumberFormat('en-US', {
															style: 'currency',
															currency: 'SEK'
														}).format(totalSplits - originalBillAmount)}
														)
													</span>
												)}
											</span>
										)}
									</div>
								)
							}}
						</form.Subscribe>
					</div>

					<form.Field name="splits" mode="array">
						{(field) => (
							<div className="space-y-3">
								{(field.state.value || []).map((_, index) => (
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
													<Button
														type="button"
														variant="ghost"
														size="icon"
														className={index === 0 ? 'mt-6' : ''}
														onClick={() => field.removeValue(index)}
														disabled={(field.state.value || []).length === 1}
													>
														<Trash2 className="h-4 w-4 text-destructive" />
													</Button>
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
														label={index === 0 ? 'Category' : undefined}
														placeholder="Select category"
														options={categories
															.filter((c) => c.types.includes('EXPENSE'))
															.map((c) => ({ value: c.id, label: c.name }))}
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
										field.pushValue({ subtitle: '', amount: 0, category: '' })
									}
									className="w-full border-dashed"
								>
									<Plus className="h-4 w-4 mr-2" />
									Add Section
								</Button>
							</div>
						)}
					</form.Field>
				</div>
			)}

			<form.AppField
				name="accountId"
				validators={{
					onChange: createZodValidator(transactionSchema.shape.accountId)
				}}
			>
				{(field) => (
					<field.SelectField
						label="Account"
						placeholder="Select an account"
						options={accounts.map((acc) => ({
							value: acc.id,
							label: acc.name
						}))}
					/>
				)}
			</form.AppField>

			{/* Recipient/Sender field - label changes based on transaction type */}
			<form.Subscribe selector={(state) => state.values.transactionType}>
				{(transactionType) => {
					// Create options for recipients
					const recipientOptions = recipients.map((r) => ({
						value: r.id,
						label: r.name
					}))

					const fieldLabel =
						transactionType === 'INCOME'
							? 'Sender (Optional)'
							: 'Recipient (Optional)'
					const placeholderText =
						transactionType === 'INCOME'
							? 'Who sent the money?'
							: 'Who receives the money?'
					const createLabelText =
						transactionType === 'INCOME'
							? 'Add new sender'
							: 'Add new recipient'

					return (
						<form.AppField name="recipient">
							{(field) => (
								<field.ComboboxField
									label={fieldLabel}
									placeholder={placeholderText}
									searchPlaceholder="Search..."
									emptyText="No matches found"
									options={recipientOptions}
									allowCreate
									createLabel={createLabelText}
								/>
							)}
						</form.AppField>
					)
				}}
			</form.Subscribe>

			<form.AppField
				name="notes"
				validators={{
					onChange: createZodValidator(transactionSchema.shape.notes)
				}}
			>
				{(field) => (
					<field.TextField
						label="Notes (Optional)"
						placeholder="Additional details..."
					/>
				)}
			</form.AppField>

			{/* Bill Selection/Creation */}
			{!isEditing && (
				<div className="space-y-4 border-t pt-4">
					<div className="flex items-center space-x-2">
						<Checkbox
							id={createBillCheckboxId}
							checked={createBill}
							onCheckedChange={(checked) => setCreateBill(checked as boolean)}
						/>
						<Label htmlFor={createBillCheckboxId} className="cursor-pointer">
							Create Bill for this transaction
						</Label>
					</div>

					{!createBill && bills.length > 0 && (
						<form.AppField
							name="billId"
							validators={{
								onChange: createZodValidator(transactionSchema.shape.billId)
							}}
						>
							{(field) => (
								<field.SelectField
									label="Link to Bill (Optional)"
									placeholder="Select a bill"
									options={[
										{ value: NO_BILL_VALUE, label: 'No bill' },
										...bills.map((bill) => ({
											value: bill.id,
											label: `${bill.name} - ${bill.recipient}`
										}))
									]}
								/>
							)}
						</form.AppField>
					)}

					{createBill && (
						<div className="space-y-4 bg-muted p-4 rounded-lg">
							<h4 className="font-semibold text-sm">Bill Details</h4>

							<div className="space-y-2">
								<Label>Recipient</Label>
								<input
									type="text"
									className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
									value={billRecipient}
									onChange={(e) => setBillRecipient(e.target.value)}
									placeholder="e.g., Tibber, Netflix"
								/>
							</div>

							<div className="space-y-2">
								<Label>Start Date (First Payment)</Label>
								<input
									type="date"
									className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
									value={billStartDate.toISOString().split('T')[0]}
									onChange={(e) => setBillStartDate(new Date(e.target.value))}
								/>
							</div>

							<div className="space-y-2">
								<Label>Recurrence</Label>
								<select
									className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
									value={billRecurrence}
									onChange={(e) =>
										setBillRecurrence(e.target.value as RecurrenceType)
									}
								>
									{recurrenceOptions.map((opt) => (
										<option key={opt.value} value={opt.value}>
											{opt.label}
										</option>
									))}
								</select>
							</div>

							{billRecurrence === RecurrenceType.CUSTOM && (
								<div className="space-y-2">
									<Label>Days Between Payments</Label>
									<input
										type="number"
										className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
										value={billCustomDays ?? ''}
										onChange={(e) =>
											setBillCustomDays(Number(e.target.value) || undefined)
										}
										placeholder="e.g., 30"
										min={1}
									/>
								</div>
							)}

							<div className="space-y-2">
								<Label>Last Payment Date (Optional)</Label>
								<input
									type="date"
									className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
									value={billLastPayment?.toISOString().split('T')[0] ?? ''}
									onChange={(e) =>
										setBillLastPayment(
											e.target.value ? new Date(e.target.value) : null
										)
									}
								/>
								<p className="text-xs text-muted-foreground">
									For bills that will end (e.g., loan payoff date)
								</p>
							</div>
						</div>
					)}
				</div>
			)}

			<form.AppForm>
				<form.FormButtonGroup onCancel={onCancel} submitLabel={submitLabel} />
			</form.AppForm>
		</form>
	)
}

// Re-export types for consumers
export type { TransactionFormData }
