import { Outlet } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAuth } from '@/contexts/auth-context'
import { useDrawer, useDrawerState } from '@/drawers'
import { NoData } from '@/features/no-data/no-data'
import { useAccountsList } from '@/hooks/api'

/**
 * Renders child routes once the household has at least one account; otherwise
 * shows the empty-account prompt with a drawer action. Lives under
 * {@link AuthProvider} (which includes {@link DrawerProvider}) so hooks resolve correctly.
 */
export function AuthenticatedOutlet() {
  const { t } = useTranslation()
  const { userId, householdId } = useAuth()
  const { openDrawer } = useDrawer()
  const { isDrawerSettled } = useDrawerState()

  const { data: accounts, isLoading } = useAccountsList({
    householdId,
    userId,
    enabled: !!householdId,
    excludeArchived: true
  })

  const accountCount = accounts?.length ?? 0
  const prevAccountCountRef = useRef<number | null>(null)
  const [deferOutletUntilDrawerSettled, setDeferOutletUntilDrawerSettled] =
    useState(false)

  useEffect(() => {
    const prev = prevAccountCountRef.current
    const n = accountCount
    if (prev !== null && prev === 0 && n > 0) {
      setDeferOutletUntilDrawerSettled(true)
    }
    if (n === 0) {
      setDeferOutletUntilDrawerSettled(false)
    }
    prevAccountCountRef.current = n
  }, [
    accountCount
  ])

  useEffect(() => {
    if (deferOutletUntilDrawerSettled && isDrawerSettled) {
      setDeferOutletUntilDrawerSettled(false)
    }
  }, [
    deferOutletUntilDrawerSettled,
    isDrawerSettled
  ])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  }

  if (accountCount === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center">
        <NoData
          variant="no-account"
          onAction={() => {
            openDrawer('createAccount', {})
          }}
          illustrationSize="lg"
        />
      </div>
    )
  }

  if (deferOutletUntilDrawerSettled) {
    return (
      <div
        aria-busy={true}
        className="flex flex-col items-center justify-center w-full h-full"
      >
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  }

  return <Outlet />
}
