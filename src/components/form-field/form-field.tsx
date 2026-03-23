import { CircleHelpIcon } from 'lucide-react'
import type * as React from 'react'
import { useTranslation } from 'react-i18next'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'

export type FormFieldProps = {
  /**
   * Visible label for the field (type-label, gray-800).
   */
  label: string
  /**
   * Optional help text shown in a tooltip on the ? control (same row as label).
   */
  labelHelpText?: string
  /**
   * Assistive / helper text (label-small, gray-800). Hidden when there is a validation error.
   */
  description?: string
  /**
   * Associated control id for the label element.
   */
  fieldId: string
  /**
   * Optional name for the label `htmlFor` when it differs from `fieldId`.
   */
  labelFor?: string
  /**
   * When set, the field title is a `<span id={groupLabelId}>` (no `htmlFor`).
   * Use for groups (e.g. several checkboxes) referenced via `aria-labelledby` on a `fieldset`.
   */
  groupLabelId?: string
  invalid?: boolean
  children: React.ReactNode
  /**
   * Validation message (label-small, red-700). Only shown when non-empty.
   */
  error?: string | null
  isValidating?: boolean
}

const iconStroke = 1.5 as const

/**
 * Shared layout for form fields: label row (optional help), control, then assistive or validation text.
 */
export function FormField({
  label,
  labelHelpText,
  description,
  fieldId,
  labelFor,
  groupLabelId,
  children,
  error,
  isValidating
}: FormFieldProps) {
  const { t } = useTranslation()
  const hasError = Boolean(error && error.length > 0)
  const forId = labelFor ?? fieldId
  const showValidating = Boolean(isValidating && !hasError)

  const titleClass = 'type-label text-gray-800'

  return (
    <div
      data-slot="form-field"
      className="flex w-full flex-col gap-1"
    >
      <div className="flex items-start justify-between gap-2">
        {groupLabelId ? (
          <span
            id={groupLabelId}
            className={titleClass}
          >
            {label}
          </span>
        ) : (
          <label
            className={titleClass}
            htmlFor={forId}
          >
            {label}
          </label>
        )}
        {labelHelpText ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex size-4 shrink-0 items-center justify-center text-gray-500 [&_svg]:size-4"
                aria-label={labelHelpText}
              >
                <CircleHelpIcon
                  strokeWidth={iconStroke}
                  aria-hidden
                />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="max-w-xs text-balance"
            >
              {labelHelpText}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>

      {children}

      {hasError ? (
        <p
          className="type-label-small text-red-700"
          role="alert"
        >
          {error}
        </p>
      ) : description ? (
        <p className="type-label-small text-gray-800">{description}</p>
      ) : null}

      {showValidating ? (
        <p className="type-label-small text-gray-800">
          {t('common.validating')}
        </p>
      ) : null}
    </div>
  )
}
