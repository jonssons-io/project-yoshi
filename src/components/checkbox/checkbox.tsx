import { Checkbox as CheckboxPrimitive } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

type CheckboxProps = {
  id: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  /** When omitted, only the control is rendered (e.g. tables, icon-only filters). */
  label?: string
  disabled?: boolean
}

export function Checkbox({
  id,
  checked,
  onCheckedChange,
  label,
  disabled
}: CheckboxProps) {
  const control = (
    <CheckboxPrimitive
      id={id}
      checked={checked}
      onCheckedChange={(c) => onCheckedChange(c === true)}
      disabled={disabled}
    />
  )

  if (label === undefined) {
    return control
  }

  return (
    <div className="flex items-center gap-2 p-0">
      {control}
      <label
        htmlFor={id}
        className={cn(
          'type-body-medium text-black leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
        )}
      >
        {label}
      </label>
    </div>
  )
}
