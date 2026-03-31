import { CheckIcon, Undo2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/button/button'

export interface FilterDrawerFooterProps {
  onReset: () => void
  onApply: () => void
}

/**
 * Shared action row for filter drawers only.
 */
export function FilterDrawerFooter({
  onReset,
  onApply
}: FilterDrawerFooterProps) {
  const { t } = useTranslation()

  return (
    <div className="flex shrink-0 flex-row flex-wrap justify-end gap-2 border-t border-gray-300 pt-4">
      <Button
        type="button"
        variant="outlined"
        color="primary"
        label={t('common.clearAllFilters')}
        icon={
          <Undo2Icon
            className="size-4 stroke-[1.5]"
            aria-hidden={true}
          />
        }
        onClick={onReset}
      />
      <Button
        type="button"
        variant="filled"
        color="primary"
        label={t('transactions.applyFilters')}
        icon={
          <CheckIcon
            className="size-4 stroke-[1.5]"
            aria-hidden={true}
          />
        }
        onClick={onApply}
      />
    </div>
  )
}
