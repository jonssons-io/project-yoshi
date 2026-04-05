import { User } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/button/button'
import {
  InputShell,
  InputShellIcon,
  inputInnerClassName
} from '@/components/input-shell/input-shell'
import { useHouseholdContext } from '@/contexts/household-context'
import { useCreateHousehold } from '@/hooks/api'
import { getErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'

export type CreateHouseholdDrawerProps = {
  onClose: () => void
}

/**
 * Drawer body: create a new household (same intent as no-household onboarding).
 */
export function CreateHouseholdDrawer({ onClose }: CreateHouseholdDrawerProps) {
  const { t } = useTranslation()
  const nameFieldId = useId()
  const { userId, setSelectedHousehold } = useHouseholdContext()
  const [name, setName] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const { mutateAsync, isPending } = useCreateHousehold({
    onSuccess: (data) => {
      setSelectedHousehold(data.id)
    }
  })

  const handleSubmit = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setLocalError(t('validation.nameRequired'))
      return
    }
    setLocalError(null)
    try {
      await mutateAsync({
        name: trimmed,
        userId
      })
      toast.success(t('households.createSuccess'))
      onClose()
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const fieldError = localError

  return (
    <form
      className="flex h-full min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault()
        void handleSubmit()
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        <div className="flex flex-col gap-1">
          <label
            className="type-label text-gray-600"
            htmlFor={nameFieldId}
          >
            {t('forms.householdName')}
          </label>
          <InputShell data-invalid={fieldError ? true : undefined}>
            <InputShellIcon>
              <User aria-hidden={true} />
            </InputShellIcon>
            <input
              id={nameFieldId}
              name="householdName"
              type="text"
              autoComplete="organization"
              placeholder={t('forms.householdPlaceholder')}
              value={name}
              disabled={isPending}
              onChange={(e) => {
                setName(e.target.value)
                setLocalError(null)
              }}
              className={cn(inputInnerClassName)}
            />
          </InputShell>
          {fieldError ? (
            <p className="type-label-small text-red-600">{fieldError}</p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-gray-200 pt-4">
        <Button
          type="button"
          variant="outlined"
          color="subtle"
          label={t('common.cancel')}
          onClick={onClose}
        />
        <Button
          type="submit"
          variant="filled"
          color="primary"
          disabled={isPending || !name.trim()}
          label={t('setup.noHouseholdButton')}
          onClick={() => void 0}
        />
      </div>
    </form>
  )
}
