/**
 * RadioGroupField component for TanStack Form
 *
 * A form field component that wraps shadcn RadioGroup for use in forms.
 */

import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldLabel
} from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useFieldContext } from '@/hooks/form'
import { cn } from '@/lib/utils'

export interface RadioGroupOption {
	value: string
	label: string
	description?: string
}

export interface RadioGroupFieldProps {
	/**
	 * Label text for the field
	 */
	label: string

	/**
	 * Optional description text shown below the label
	 */
	description?: string

	/**
	 * Whether the field is disabled
	 */
	disabled?: boolean

	/**
	 * Available options to select from
	 */
	options: RadioGroupOption[]

	/**
	 * Layout direction for the radio items
	 * @default "horizontal"
	 */
	direction?: 'horizontal' | 'vertical'

	/**
	 * Callback when value changes (for side effects, not for controlling value)
	 */
	onValueChange?: (value: string) => void
}

export function RadioGroupField({
	label,
	description,
	disabled,
	options,
	direction = 'horizontal',
	onValueChange
}: RadioGroupFieldProps) {
	const field = useFieldContext<string>()

	const hasError =
		field.state.meta.isTouched && field.state.meta.errors.length > 0

	const handleChange = (value: string) => {
		field.handleChange(value)
		onValueChange?.(value)
	}

	return (
		<Field data-invalid={hasError || undefined}>
			<FieldContent>
				<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
				{description && <FieldDescription>{description}</FieldDescription>}

				<RadioGroup
					id={field.name}
					value={field.state.value}
					onValueChange={handleChange}
					disabled={disabled}
					className={cn(
						'flex gap-4',
						direction === 'vertical' && 'flex-col gap-2'
					)}
				>
					{options.map((option) => (
						<div key={option.value} className="flex items-center gap-2">
							<RadioGroupItem
								value={option.value}
								id={`${field.name}-${option.value}`}
							/>
							<Label
								htmlFor={`${field.name}-${option.value}`}
								className="font-normal cursor-pointer"
							>
								{option.label}
							</Label>
						</div>
					))}
				</RadioGroup>

				{hasError && (
					<FieldError>{field.state.meta.errors.join(', ')}</FieldError>
				)}
				{field.state.meta.isValidating && (
					<span className="text-sm text-muted-foreground">Validating...</span>
				)}
			</FieldContent>
		</Field>
	)
}
