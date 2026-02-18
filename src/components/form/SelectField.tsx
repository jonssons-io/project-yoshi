/**
 * SelectField component for TanStack Form
 *
 * Integrates shadcn-ui Field and Select with TanStack Form
 */

import { useTranslation } from 'react-i18next'
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldLabel
} from '@/components/ui/field'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { useFieldContext } from '@/hooks/form'

export interface SelectFieldProps {
	/**
	 * Label text for the field
	 */
	label: string

	/**
	 * Optional description text shown below the label
	 */
	description?: string

	/**
	 * Optional placeholder text
	 */
	placeholder?: string

	/**
	 * Whether the field is disabled
	 */
	disabled?: boolean

	/**
	 * Select options
	 */
	options: Array<{ value: string; label: string }>
}

export function SelectField({
	label,
	description,
	placeholder,
	disabled,
	options
}: SelectFieldProps) {
	const { t } = useTranslation()
	const field = useFieldContext<string>()

	const effectivePlaceholder = placeholder ?? t('common.selectAnOption')

	const hasError =
		field.state.meta.isTouched && field.state.meta.errors.length > 0

	return (
		<Field data-invalid={hasError || undefined}>
			<FieldContent>
				<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
				{description && <FieldDescription>{description}</FieldDescription>}
				<Select
					value={field.state.value ?? ''}
					onValueChange={(value) => field.handleChange(value)}
					disabled={disabled}
				>
					<SelectTrigger id={field.name}>
						<SelectValue placeholder={effectivePlaceholder} />
					</SelectTrigger>
					<SelectContent>
						{options.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
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
