import type { ReactNode } from 'react'

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export type DataTableQuickFilterSwitchProps = {
  id: string
  label: ReactNode
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}

/**
 * Toolbar quick filter: label + switch. Pages compose several of these in `DataTable` `quickFilters`.
 */
export function DataTableQuickFilterSwitch({
  id,
  label,
  checked,
  onCheckedChange,
  disabled
}: DataTableQuickFilterSwitchProps) {
  return (
    <div className="flex items-center gap-2">
      <Label
        htmlFor={id}
        className="type-label cursor-pointer text-gray-700"
      >
        {label}
      </Label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  )
}
