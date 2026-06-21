import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ComboboxValue } from '@/components/form'
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
import { cn } from '@/lib/utils'
import type { ImportLookupItem, TransactionDraft } from '../types'

export const DRAFT_CONTROL_CLASS_NAME =
  'w-full min-w-40 rounded-sm border border-input bg-card px-4 py-1 type-label text-foreground outline-none transition-colors focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50'

export function activeOptions(items: ImportLookupItem[]): ImportLookupItem[] {
  return items.filter((item) => !item.archived)
}

export function lookupItemsToComboboxOptions(items: ImportLookupItem[]): Array<{
  value: string
  label: string
}> {
  return activeOptions(items).map((item) => ({
    value: item.id,
    label: item.name
  }))
}

export function idOrNewNameToComboboxValue(
  id: string | null | undefined,
  newName: string | null | undefined
): ComboboxValue {
  if (newName?.trim()) {
    return {
      isNew: true,
      name: newName.trim()
    }
  }
  if (id) return id
  return null
}

export function comboboxValueToIdAndNewName(value: ComboboxValue): {
  id: string | null
  newName: string | null
} {
  if (!value) {
    return {
      id: null,
      newName: null
    }
  }
  if (typeof value === 'string') {
    return {
      id: value,
      newName: null
    }
  }
  if (value.isNew) {
    return {
      id: null,
      newName: value.name
    }
  }
  return {
    id: null,
    newName: null
  }
}

export function hasImportCategory(draft: TransactionDraft): boolean {
  return Boolean(draft.categoryId || draft.newCategoryName?.trim())
}

export function hasImportRecipient(draft: TransactionDraft): boolean {
  return Boolean(draft.recipientId || draft.newRecipientName?.trim())
}

export function hasImportIncomeSource(draft: TransactionDraft): boolean {
  return Boolean(draft.incomeSourceId || draft.newIncomeSourceName?.trim())
}

export function SelectOptionList({ items }: { items: ImportLookupItem[] }) {
  return activeOptions(items).map((item) => (
    <option
      key={item.id}
      value={item.id}
    >
      {item.name}
    </option>
  ))
}

export function DraftSelect({
  id,
  value,
  disabled,
  className,
  onChange,
  children
}: {
  id?: string
  value: string
  disabled?: boolean
  className?: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <select
      id={id}
      className={cn(DRAFT_CONTROL_CLASS_NAME, className)}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    >
      {children}
    </select>
  )
}

export function DraftCombobox({
  value,
  disabled,
  placeholder,
  options,
  allowCreate = false,
  createLabel,
  onChange
}: {
  value: ComboboxValue
  disabled?: boolean
  placeholder?: string
  options: Array<{
    value: string
    label: string
  }>
  allowCreate?: boolean
  createLabel?: string
  onChange: (value: ComboboxValue) => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')

  const getDisplayValue = (): string => {
    if (!value) return ''
    if (typeof value === 'string') {
      return options.find((option) => option.value === value)?.label ?? ''
    }
    if (typeof value === 'object' && value.isNew) {
      return value.name
    }
    return ''
  }

  const exactMatch = options.find(
    (option) => option.label.toLowerCase() === searchValue.toLowerCase()
  )
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchValue.toLowerCase())
  )
  const showCreateOption =
    allowCreate && searchValue.trim() !== '' && !exactMatch

  const displayValue = getDisplayValue()
  const isNewValue = typeof value === 'object' && value?.isNew
  const selectedString = typeof value === 'string' ? value : null

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger asChild>
        <ShadcnButton
          type="button"
          disabled={disabled}
          aria-expanded={open}
          className={cn(
            inputShellClassName,
            DRAFT_CONTROL_CLASS_NAME,
            'group h-auto min-h-7 justify-between gap-2 font-normal'
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
              (placeholder ?? t('common.selectAnOption'))
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
        className="flex w-(--radix-popover-trigger-width) flex-col gap-0 overflow-hidden rounded-sm border border-border bg-popover p-0 text-popover-foreground shadow-md"
        align="start"
      >
        <DropdownSearchInput
          placeholder={t('common.search')}
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          clearable
        />
        <div
          className="h-px w-full shrink-0 bg-gray-300"
          aria-hidden
        />
        <div className="flex max-h-[min(300px,var(--radix-popover-content-available-height))] flex-col gap-2 overflow-y-auto">
          {filteredOptions.length === 0 && !showCreateOption ? (
            <p className="type-label px-2 py-1 text-center text-black">
              {t('common.noResultsFound')}
            </p>
          ) : null}
          {filteredOptions.map((option) => {
            const isSelected = selectedString === option.value
            return (
              <button
                key={option.value}
                type="button"
                className="flex w-full items-center justify-between gap-2 rounded-none px-2 py-1 type-label text-black hover:bg-gray-100"
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                  setSearchValue('')
                }}
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
              onClick={() => {
                onChange({
                  isNew: true,
                  name: searchValue.trim()
                })
                setOpen(false)
                setSearchValue('')
              }}
            >
              <PlusIcon
                strokeWidth={INPUT_ICON_STROKE}
                className="size-4 shrink-0 text-gray-500"
                aria-hidden
              />
              <span className="truncate text-left">
                {`${createLabel ?? t('common.create')} "${searchValue.trim()}"`}
              </span>
            </button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function DraftTextInput({
  value,
  disabled,
  type = 'text',
  onChange
}: {
  value: string
  disabled?: boolean
  type?: 'text' | 'date'
  onChange: (value: string) => void
}) {
  return (
    <input
      className={DRAFT_CONTROL_CLASS_NAME}
      value={value}
      disabled={disabled}
      type={type}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

export function DraftPlainText({ children }: { children: ReactNode }) {
  return <span className="type-label text-foreground">{children}</span>
}
