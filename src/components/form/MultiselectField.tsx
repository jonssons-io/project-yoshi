/**
 * MultiselectField — searchable multi-select with pills in the trigger
 */

import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FormField } from '@/components/form-field/form-field'
import {
  INPUT_ICON_STROKE,
  inputShellClassName
} from '@/components/input-shell/input-shell'
import { Pill } from '@/components/pill/pill'
import { DropdownSearchInput } from '@/components/search-input/search-input'
import { ShadcnButton } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { useFieldContext } from '@/hooks/form'
import { cn } from '@/lib/utils'

export interface MultiselectOption {
  value: string
  label: string
}

export interface MultiselectFieldProps {
  label: string
  labelHelpText?: string
  description?: string
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  options: MultiselectOption[]
}

export function MultiselectField({
  label,
  labelHelpText,
  description,
  placeholder,
  searchPlaceholder,
  emptyText,
  disabled,
  options
}: MultiselectFieldProps) {
  const field = useFieldContext<string[]>()
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const { t } = useTranslation()

  const textValues = {
    placeholder: t('common.selectAnOption'),
    searchPlaceholder: t('common.search'),
    emptyText: t('common.noResultsFound')
  }

  const hasError =
    field.state.meta.isTouched && field.state.meta.errors.length > 0
  const errorText = hasError ? field.state.meta.errors.join(', ') : null

  const selected = field.state.value ?? []

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchValue.toLowerCase())
  )

  const toggle = (value: string, checked: boolean) => {
    const next = new Set(selected)
    if (checked) {
      next.add(value)
    } else {
      next.delete(value)
    }
    field.handleChange([
      ...next
    ])
  }

  const remove = (value: string) => {
    field.handleChange(selected.filter((v) => v !== value))
  }

  const labelByValue = (v: string) =>
    options.find((o) => o.value === v)?.label ?? v

  return (
    <FormField
      label={label}
      labelHelpText={labelHelpText}
      description={description}
      fieldId={field.name}
      error={errorText}
      isValidating={Boolean(field.state.meta.isValidating && !hasError)}
    >
      <Popover
        open={open}
        onOpenChange={setOpen}
      >
        <PopoverTrigger asChild>
          <ShadcnButton
            id={field.name}
            type="button"
            disabled={disabled}
            aria-expanded={open}
            aria-invalid={hasError || undefined}
            className={cn(
              inputShellClassName,
              'group min-h-8 w-full items-start justify-between gap-2 font-normal'
            )}
          >
            <span className="flex min-h-6 min-w-0 flex-1 flex-wrap items-center gap-2">
              {selected.length === 0 ? (
                <span className="type-label text-gray-500">
                  {placeholder ?? textValues.placeholder}
                </span>
              ) : (
                selected.map((v) => (
                  <Pill
                    key={v}
                    onRemove={() => remove(v)}
                    decorativeRemove
                    removeLabel={t('common.delete')}
                  >
                    {labelByValue(v)}
                  </Pill>
                ))
              )}
            </span>
            <ChevronDownIcon
              strokeWidth={INPUT_ICON_STROKE}
              className="mt-0.5 size-4 shrink-0 self-start text-gray-500 group-data-[state=open]:hidden"
              aria-hidden
            />
            <ChevronUpIcon
              strokeWidth={INPUT_ICON_STROKE}
              className="mt-0.5 hidden size-4 shrink-0 self-start text-gray-500 group-data-[state=open]:block"
              aria-hidden
            />
          </ShadcnButton>
        </PopoverTrigger>
        <PopoverContent
          className="flex w-(--radix-popover-trigger-width) flex-col gap-0 overflow-hidden rounded-sm border border-gray-300 bg-white p-0 shadow-md"
          align="start"
        >
          <DropdownSearchInput
            placeholder={searchPlaceholder ?? textValues.searchPlaceholder}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
          <div
            className="h-px w-full shrink-0 bg-gray-300"
            aria-hidden
          />
          <div className="flex max-h-[min(300px,var(--radix-popover-content-available-height))] flex-col gap-2 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <p className="type-label px-2 py-1 text-center text-black">
                {emptyText ?? textValues.emptyText}
              </p>
            ) : (
              filteredOptions.map((option) => {
                const isOn = selected.includes(option.value)
                const id = `${field.name}-${option.value}`
                return (
                  <div
                    key={option.value}
                    className="flex items-center gap-2 rounded-none px-2 py-1 hover:bg-gray-100"
                  >
                    <Checkbox
                      id={id}
                      checked={isOn}
                      onCheckedChange={(c) => toggle(option.value, c === true)}
                    />
                    <label
                      htmlFor={id}
                      className="type-label flex-1 cursor-pointer text-black"
                    >
                      {option.label}
                    </label>
                  </div>
                )
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </FormField>
  )
}
