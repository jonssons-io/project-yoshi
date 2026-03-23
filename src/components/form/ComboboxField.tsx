/**
 * ComboboxField — searchable single-select with optional create
 */

import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FormField } from '@/components/form-field/form-field'
import {
  INPUT_ICON_STROKE,
  inputShellClassName
} from '@/components/input-shell/input-shell'
import { DropdownSearchInput } from '@/components/search-input/search-input'
import { ShadcnButton } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { useFieldContext } from '@/hooks/form'
import { cn } from '@/lib/utils'

export interface ComboboxOption {
  value: string
  label: string
}

export type ComboboxValue =
  | string
  | {
      isNew: true
      name: string
    }
  | null

export interface ComboboxFieldProps {
  label: string
  labelHelpText?: string
  description?: string
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  options: ComboboxOption[]
  allowCreate?: boolean
  createLabel?: string
}

export function ComboboxField({
  label,
  labelHelpText,
  description,
  placeholder,
  searchPlaceholder,
  emptyText,
  disabled,
  options,
  allowCreate = false,
  createLabel
}: ComboboxFieldProps) {
  const field = useFieldContext<ComboboxValue>()
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const { t } = useTranslation()
  const textValues = {
    create: t('common.create'),
    placeholder: t('common.selectAnOption'),
    searchPlaceholder: t('common.search'),
    emptyText: t('common.noResultsFound')
  }

  const hasError =
    field.state.meta.isTouched && field.state.meta.errors.length > 0
  const errorText = hasError ? field.state.meta.errors.join(', ') : null

  const getDisplayValue = (): string => {
    const value = field.state.value
    if (!value) {
      return ''
    }
    if (typeof value === 'string') {
      const option = options.find((opt) => opt.value === value)
      return option?.label ?? ''
    }
    if (typeof value === 'object' && value.isNew) {
      return value.name
    }
    return ''
  }

  const exactMatch = options.find(
    (opt) => opt.label.toLowerCase() === searchValue.toLowerCase()
  )

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchValue.toLowerCase())
  )

  const showCreateOption =
    allowCreate && searchValue.trim() !== '' && !exactMatch

  const handleSelect = (optionValue: string) => {
    field.handleChange(optionValue)
    setOpen(false)
    setSearchValue('')
  }

  const handleCreate = () => {
    field.handleChange({
      isNew: true,
      name: searchValue.trim()
    })
    setOpen(false)
    setSearchValue('')
  }

  const displayValue = getDisplayValue()
  const isNewValue =
    typeof field.state.value === 'object' && field.state.value?.isNew

  const selectedString =
    typeof field.state.value === 'string' ? field.state.value : null

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
              'group min-h-7 w-full justify-between gap-2 font-normal',
              !displayValue && 'text-gray-500'
            )}
          >
            <span className="min-w-0 flex-1 truncate text-left type-label">
              {displayValue ? (
                <span className="flex min-w-0 items-center gap-2">
                  {isNewValue ? (
                    <span className="type-label shrink-0 rounded-sm border border-gray-300 bg-gray-100 px-1.5 py-0.5 text-gray-800">
                      {t('common.new')}
                    </span>
                  ) : null}
                  <span className="min-w-0 truncate text-black">
                    {displayValue}
                  </span>
                </span>
              ) : (
                (placeholder ?? textValues.placeholder)
              )}
            </span>
            <ChevronDownIcon
              strokeWidth={INPUT_ICON_STROKE}
              className="size-4 shrink-0 text-gray-500 group-data-[state=open]:hidden"
              aria-hidden
            />
            <ChevronUpIcon
              strokeWidth={INPUT_ICON_STROKE}
              className="hidden size-4 shrink-0 text-gray-500 group-data-[state=open]:block"
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
            {filteredOptions.length === 0 && !showCreateOption ? (
              <p className="type-label px-2 py-1 text-center text-black">
                {emptyText ?? textValues.emptyText}
              </p>
            ) : null}
            {filteredOptions.map((option) => {
              const isSelected = selectedString === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-none px-2 py-1 type-label text-black hover:bg-gray-100"
                  onClick={() => handleSelect(option.value)}
                >
                  <span className="min-w-0 flex-1 truncate text-left">
                    {option.label}
                  </span>
                  {isSelected ? (
                    <CheckIcon
                      strokeWidth={INPUT_ICON_STROKE}
                      className="size-4 shrink-0 text-green-500"
                      aria-hidden
                    />
                  ) : null}
                </button>
              )
            })}
            {showCreateOption ? (
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-none px-2 py-1 type-label text-black hover:bg-gray-100"
                onClick={handleCreate}
              >
                <PlusIcon
                  strokeWidth={INPUT_ICON_STROKE}
                  className="size-4 shrink-0 text-gray-500"
                  aria-hidden
                />
                <span className="truncate text-left">
                  {`${createLabel || textValues.create} "${searchValue.trim()}"`}
                </span>
              </button>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
    </FormField>
  )
}
