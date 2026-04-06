import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  InputShell,
  inputInnerClassName
} from '@/components/input-shell/input-shell'
import { useHouseholdContext } from '@/contexts/household-context'
import { useCreateHousehold } from '@/hooks/api'
import { cn } from '@/lib/utils'

import { NoData } from './no-data'

type IllustrationSize = 'sm' | 'md' | 'lg'

type NoHouseholdOnboardingProps = {
  illustrationSize?: IllustrationSize
}

/**
 * Empty state for users with no households: name field and CTA wired to
 * {@link useCreateHousehold}, then selects the new household as default.
 */
export function NoHouseholdOnboarding({
  illustrationSize = 'lg'
}: NoHouseholdOnboardingProps) {
  const { t } = useTranslation()
  const nameFieldId = useId()
  const { userId, setSelectedHousehold } = useHouseholdContext()
  const [name, setName] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const { mutate, isPending, error } = useCreateHousehold({
    onSuccess: (data) => {
      setSelectedHousehold(data.id)
    }
  })

  const handleCreate = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setLocalError(t('validation.nameRequired'))
      return
    }
    setLocalError(null)
    mutate({
      name: trimmed,
      userId
    })
  }

  const fieldError =
    localError ?? (error instanceof Error ? error.message : null)

  return (
    <NoData
      variant="no-household"
      illustrationSize={illustrationSize}
      beforeAction={
        <form
          className="flex w-full flex-col gap-1"
          onSubmit={(e) => {
            e.preventDefault()
            handleCreate()
          }}
        >
          <InputShell data-invalid={fieldError ? true : undefined}>
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
        </form>
      }
      actionDisabled={isPending || !name.trim()}
      onAction={handleCreate}
    />
  )
}
