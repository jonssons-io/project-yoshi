import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Checkbox } from '@/components/checkbox/checkbox'
import {
  INPUT_ICON_STROKE,
  inputShellClassName
} from '@/components/input-shell/input-shell'
import { Pill } from '@/components/pill/pill'
import { DropdownSearchInput } from '@/components/search-input/search-input'
import { ShadcnButton } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type FilterMultiselectOption = {
  value: string
  label: string
}

export type FilterMultiselectProps = {
  value: string[]
  onChange: (value: string[]) => void
  options: FilterMultiselectOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
}

/**
 * Controlled multiselect with pills in the trigger, used in filter drawers.
 */
export function FilterMultiselect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
  disabled
}: FilterMultiselectProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')

  const filteredOptions = useMemo(
    () =>
      options.filter((option) =>
        option.label.toLowerCase().includes(searchValue.toLowerCase())
      ),
    [
      options,
      searchValue
    ]
  )

  const labelByValue = useMemo(
    () =>
      new Map(
        options.map((option) => [
          option.value,
          option.label
        ])
      ),
    [
      options
    ]
  )

  const toggle = (nextValue: string, checked: boolean) => {
    const next = new Set(value)
    if (checked) {
      next.add(nextValue)
    } else {
      next.delete(nextValue)
    }
    onChange([
      ...next
    ])
  }

  const remove = (nextValue: string) => {
    onChange(value.filter((item) => item !== nextValue))
  }

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
            'group min-h-8 w-full items-start justify-between gap-2 font-normal'
          )}
        >
          <span className="flex min-h-6 min-w-0 flex-1 flex-wrap items-center gap-2">
            {value.length === 0 ? (
              <span className="type-label text-gray-500">
                {placeholder ?? t('common.selectAnOption')}
              </span>
            ) : (
              value.map((item) => (
                <Pill
                  key={item}
                  onRemove={() => remove(item)}
                  removeLabel={t('common.delete')}
                >
                  {labelByValue.get(item) ?? item}
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
          placeholder={searchPlaceholder ?? t('common.search')}
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
        />
        <div
          className="h-px w-full shrink-0 bg-gray-300"
          aria-hidden={true}
        />
        <div
          className="flex max-h-[min(300px,var(--radix-popover-content-available-height))] min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain"
          onWheel={(e) => {
            e.stopPropagation()
          }}
        >
          {filteredOptions.length === 0 ? (
            <p className="type-label px-2 py-1 text-center text-black">
              {emptyText ?? t('common.noResultsFound')}
            </p>
          ) : (
            filteredOptions.map((option) => {
              const checked = value.includes(option.value)
              const id = `filter-multiselect-${option.value}`

              return (
                <div
                  key={option.value}
                  className="flex items-center gap-2 rounded-none px-2 py-1 hover:bg-gray-100"
                >
                  <Checkbox
                    id={id}
                    checked={checked}
                    onCheckedChange={(nextChecked) =>
                      toggle(option.value, nextChecked)
                    }
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
  )
}
