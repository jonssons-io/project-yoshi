/**
 * Household Form Component
 * Used for creating and editing households
 */

import { z } from 'zod'
import { useAppForm } from '@/hooks/form'
import { createZodValidator, validateForm } from '@/lib/form-validation'

const householdSchema = z.object({
	name: z.string().min(1, { message: 'Name is required' })
})

type HouseholdFormData = z.infer<typeof householdSchema>

interface HouseholdFormProps {
	defaultValues?: Partial<HouseholdFormData>
	onSubmit: (data: HouseholdFormData) => Promise<void> | void
	onCancel?: () => void
	onDelete?: () => void
	submitLabel?: string
}

export function HouseholdForm({
	defaultValues,
	onSubmit,
	onCancel,
	onDelete,
	submitLabel = 'Save'
}: HouseholdFormProps) {
	const form = useAppForm({
		defaultValues: {
			name: defaultValues?.name ?? ''
		},
		onSubmit: async ({ value }) => {
			const data = validateForm(householdSchema, value)
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
		>
			<div className="space-y-4">
				<form.AppField
					name="name"
					validators={{
						onChange: createZodValidator(householdSchema.shape.name)
					}}
				>
					{(field) => (
						<field.TextField
							label="Household Name"
							placeholder="e.g., Smith Family, Roommates"
						/>
					)}
				</form.AppField>

				<form.AppForm>
					<form.FormButtonGroup
						onDelete={onDelete}
						onCancel={onCancel}
						submitLabel={submitLabel}
					/>
				</form.AppForm>
			</div>
		</form>
	)
}
