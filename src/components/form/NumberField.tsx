/**
 * NumberField component for TanStack Form
 *
 * Specialized text field for numeric inputs
 */

import { useTranslation } from 'react-i18next'
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldLabel
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useFieldContext } from '@/hooks/form'

export interface NumberFieldProps {
	/**
	 * Label text for the field
	 */
	label: string

	/**
	 * Optional description text shown below the label
	 */
	description?: string

	/**
	 * Optional placeholder text for the input
	 */
	placeholder?: string

	/**
	 * Whether the field is disabled
	 */
	disabled?: boolean

	/**
	 * Minimum value
	 */
	min?: number

	/**
	 * Maximum value
	 */
	max?: number

	/**
	 * Step increment
	 */
	step?: string | number
}

export function NumberField({
	label,
	description,
	placeholder,
	disabled,
	min,
	max,
	step = '0.01'
}: NumberFieldProps) {
	const { t } = useTranslation()
	const field = useFieldContext<number>()

	const hasError =
		field.state.meta.isTouched && field.state.meta.errors.length > 0

	return (
		<Field data-invalid={hasError || undefined}>
			<FieldContent>
				<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
				{description && <FieldDescription>{description}</FieldDescription>}
				<Input
					id={field.name}
					name={field.name}
					type="number"
					placeholder={placeholder}
					value={field.state.value === 0 ? '' : field.state.value}
					onChange={(e) => {
						const value =
							e.target.value === '' ? 0 : Number.parseFloat(e.target.value)
						field.handleChange(Number.isNaN(value) ? 0 : value)
					}}
					onBlur={field.handleBlur}
					disabled={disabled}
					min={min}
					max={max}
					step={step}
					aria-invalid={hasError || undefined}
				/>
				{hasError && (
					<FieldError>{field.state.meta.errors.join(', ')}</FieldError>
				)}
				{field.state.meta.isValidating && (
					<span className="text-sm text-muted-foreground">
						{t('common.validating')}
					</span>
				)}
			</FieldContent>
		</Field>
	)
}
