/**
 * BillForm - Form for creating and editing bills
 */

import { z } from "zod";
import {
	createZodValidator,
	useAppForm,
	validateForm,
} from "@/components/form";
import { RecurrenceType } from "@/generated/prisma/enums";

const billSchema = z.object({
	name: z.string().min(1, { message: "Name is required" }),
	recipient: z.string().min(1, { message: "Recipient is required" }),
	accountId: z.string().min(1, { message: "Account is required" }),
	startDate: z.date({ message: "Start date is required" }),
	recurrenceType: z.enum(
		[
			RecurrenceType.NONE,
			RecurrenceType.WEEKLY,
			RecurrenceType.MONTHLY,
			RecurrenceType.QUARTERLY,
			RecurrenceType.YEARLY,
			RecurrenceType.CUSTOM,
		],
		{ message: "Recurrence type is required" },
	),
	customIntervalDays: z.number().int().positive().optional(),
	estimatedAmount: z.number().positive({ message: "Amount must be positive" }),
	lastPaymentDate: z.date().optional().nullable(),
	categoryId: z.string().min(1, { message: "Category is required" }),
});

export type BillFormData = z.infer<typeof billSchema>;

interface BillFormProps {
	initialData?: Partial<BillFormData>;
	onSubmit: (data: BillFormData) => void;
	onCancel: () => void;
	accounts: Array<{ id: string; name: string }>;
	categories: Array<{ id: string; name: string }>;
	isSubmitting?: boolean;
}

const recurrenceOptions = [
	{ value: RecurrenceType.NONE, label: "No recurrence (one-time)" },
	{ value: RecurrenceType.WEEKLY, label: "Weekly" },
	{ value: RecurrenceType.MONTHLY, label: "Monthly" },
	{ value: RecurrenceType.QUARTERLY, label: "Quarterly (every 3 months)" },
	{ value: RecurrenceType.YEARLY, label: "Yearly" },
	{ value: RecurrenceType.CUSTOM, label: "Custom interval" },
];

export function BillForm({
	initialData,
	onSubmit,
	onCancel,
	accounts,
	categories,
	isSubmitting,
}: BillFormProps) {
	const form = useAppForm({
		defaultValues: {
			name: initialData?.name ?? "",
			recipient: initialData?.recipient ?? "",
			accountId: initialData?.accountId ?? "",
			startDate: initialData?.startDate ?? new Date(),
			recurrenceType: initialData?.recurrenceType ?? RecurrenceType.MONTHLY,
			customIntervalDays: initialData?.customIntervalDays ?? undefined,
			estimatedAmount: initialData?.estimatedAmount ?? 0,
			lastPaymentDate: initialData?.lastPaymentDate ?? null,
			categoryId: initialData?.categoryId ?? "",
		},
		onSubmit: async ({ value }) => {
			const data = validateForm(billSchema, value);
			await onSubmit(data);
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.handleSubmit();
			}}
			className="space-y-4"
		>
			<form.AppField
				name="name"
				validators={{
					onChange: createZodValidator(billSchema.shape.name),
				}}
			>
				{(field) => (
					<field.TextField label="Bill Name" placeholder="e.g. Electricity" />
				)}
			</form.AppField>

			<form.AppField
				name="recipient"
				validators={{
					onChange: createZodValidator(billSchema.shape.recipient),
				}}
			>
				{(field) => (
					<field.TextField label="Recipient" placeholder="e.g. Tibber" />
				)}
			</form.AppField>

			<form.AppField
				name="accountId"
				validators={{
					onChange: createZodValidator(billSchema.shape.accountId),
				}}
			>
				{(field) => (
					<field.SelectField
						label="Account"
						placeholder="Select account"
						options={accounts.map((account) => ({
							value: account.id,
							label: account.name,
						}))}
					/>
				)}
			</form.AppField>

			<form.AppField
				name="categoryId"
				validators={{
					onChange: createZodValidator(billSchema.shape.categoryId),
				}}
			>
				{(field) => (
					<field.SelectField
						label="Category"
						placeholder="Select category"
						options={categories.map((category) => ({
							value: category.id,
							label: category.name,
						}))}
					/>
				)}
			</form.AppField>

			<form.AppField
				name="estimatedAmount"
				validators={{
					onChange: createZodValidator(billSchema.shape.estimatedAmount),
				}}
			>
				{(field) => (
					<field.NumberField
						label="Estimated Amount"
						placeholder="0.00"
						step="0.01"
					/>
				)}
			</form.AppField>

			<form.AppField
				name="startDate"
				validators={{
					onChange: createZodValidator(billSchema.shape.startDate),
				}}
			>
				{(field) => <field.DateField label="Start Date (First Payment)" />}
			</form.AppField>

			<form.AppField
				name="recurrenceType"
				validators={{
					onChange: createZodValidator(billSchema.shape.recurrenceType),
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
										billSchema.shape.customIntervalDays,
									),
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
					onChange: createZodValidator(billSchema.shape.lastPaymentDate),
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
							? "Saving..."
							: initialData
								? "Update Bill"
								: "Create Bill"
					}
				/>
			</form.AppForm>
		</form>
	);
}
