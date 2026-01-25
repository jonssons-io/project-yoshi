/**
 * TransferForm - Form for creating and editing fund transfers between accounts
 *
 * Features:
 * - Account selection for source and destination
 * - Filters destination to exclude selected source
 * - Amount and date fields
 * - Optional notes
 */

import { z } from 'zod'
import { createZodValidator, useAppForm, validateForm } from '@/components/form'

const transferSchema = z.object({
	fromAccountId: z.string().min(1, { message: 'Source account is required' }),
	toAccountId: z
		.string()
		.min(1, { message: 'Destination account is required' }),
	amount: z.number().positive({ message: 'Amount must be positive' }),
	date: z.date({ message: 'Date is required' }),
	notes: z.string().optional()
})

type TransferFormData = z.infer<typeof transferSchema>

export interface TransferFormProps {
	/**
	 * Initial values for editing an existing transfer
	 */
	defaultValues?: {
		fromAccountId?: string
		toAccountId?: string
		amount?: number
		date?: Date
		notes?: string
	}

	/**
	 * Available accounts (only budget-linked accounts)
	 */
	accounts: Array<{ id: string; name: string }>

	/**
	 * Callback when form is submitted successfully
	 */
	onSubmit: (data: TransferFormData) => Promise<void> | void

	/**
	 * Callback when form is cancelled
	 */
	onCancel?: () => void

	/**
	 * Submit button text
	 */
	submitLabel?: string

	/**
	 * Is this for editing an existing transfer?
	 */
	isEditing?: boolean
}

export function TransferForm({
	defaultValues,
	accounts,
	onSubmit,
	onCancel,
	submitLabel = 'Create Transfer'
}: TransferFormProps) {
	const form = useAppForm({
		defaultValues: {
			fromAccountId: defaultValues?.fromAccountId ?? '',
			toAccountId: defaultValues?.toAccountId ?? '',
			amount: defaultValues?.amount ?? 0,
			date: defaultValues?.date ?? new Date(),
			notes: defaultValues?.notes ?? ''
		},
		onSubmit: async ({ value }) => {
			const data = validateForm(transferSchema, value)
			await onSubmit(data)
		}
	})

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault()
				e.stopPropagation()
				form.handleSubmit()
			}}
			className="space-y-4"
		>
			{/* Source Account - subscribes to toAccountId to filter options */}
			<form.Subscribe selector={(state) => state.values.toAccountId}>
				{(toAccountId) => {
					// Filter out the destination account from source options
					const sourceOptions = accounts
						.filter((acc) => acc.id !== toAccountId)
						.map((acc) => ({
							value: acc.id,
							label: acc.name
						}))

					return (
						<form.AppField
							name="fromAccountId"
							validators={{
								onChange: createZodValidator(transferSchema.shape.fromAccountId)
							}}
						>
							{(field) => (
								<field.SelectField
									label="From Account"
									placeholder="Select source account"
									options={sourceOptions}
								/>
							)}
						</form.AppField>
					)
				}}
			</form.Subscribe>

			{/* Destination Account - subscribes to fromAccountId to filter options */}
			<form.Subscribe selector={(state) => state.values.fromAccountId}>
				{(fromAccountId) => {
					// Filter out the source account from destination options
					const destOptions = accounts
						.filter((acc) => acc.id !== fromAccountId)
						.map((acc) => ({
							value: acc.id,
							label: acc.name
						}))

					return (
						<form.AppField
							name="toAccountId"
							validators={{
								onChange: createZodValidator(transferSchema.shape.toAccountId)
							}}
						>
							{(field) => (
								<field.SelectField
									label="To Account"
									placeholder="Select destination account"
									options={destOptions}
								/>
							)}
						</form.AppField>
					)
				}}
			</form.Subscribe>

			<form.AppField
				name="amount"
				validators={{
					onChange: createZodValidator(transferSchema.shape.amount)
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
					onChange: createZodValidator(transferSchema.shape.date)
				}}
			>
				{(field) => <field.DateField label="Date" />}
			</form.AppField>

			<form.AppField
				name="notes"
				validators={{
					onChange: createZodValidator(transferSchema.shape.notes)
				}}
			>
				{(field) => (
					<field.TextField
						label="Notes (Optional)"
						placeholder="Add any notes about this transfer..."
					/>
				)}
			</form.AppField>

			<form.AppForm>
				<form.FormButtonGroup onCancel={onCancel} submitLabel={submitLabel} />
			</form.AppForm>
		</form>
	)
}

// Re-export types for consumers
export type { TransferFormData }
