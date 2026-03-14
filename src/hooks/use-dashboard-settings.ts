import { useEffect, useMemo, useState } from 'react'
import type { DateRangeOption } from '@/lib/dashboard-utils'

const STORAGE_PREFIX = 'yoshi-dashboard-settings-v1'

type AccountLike = {
  id: string
}

type UseDashboardSettingsParams = {
  userId: string
  accounts: AccountLike[] | undefined
}

type UseDashboardSettingsResult = {
  quickSelection: DateRangeOption
  setQuickSelection: (value: DateRangeOption) => void
  customStartDate: Date | undefined
  customEndDate: Date | undefined
  setCustomDateRange: (start?: Date, end?: Date) => void
  selectedAccountIds: string[]
  updateSelectedAccounts: (newIds: string[]) => void
}

/**
 * Stores dashboard chart/date/account selections per user in localStorage.
 */
export function useDashboardSettings({
  userId,
  accounts
}: UseDashboardSettingsParams): UseDashboardSettingsResult {
  const accountSelectionKey = useMemo(
    () => `${STORAGE_PREFIX}-accounts-${userId}`,
    [
      userId
    ]
  )
  const dateRangeKey = useMemo(
    () => `${STORAGE_PREFIX}-date-range-${userId}`,
    [
      userId
    ]
  )

  const [quickSelection, setQuickSelectionState] =
    useState<DateRangeOption>('current-month')
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(
    undefined
  )
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(
    undefined
  )
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
  const [isAccountSelectionInitialized, setIsAccountSelectionInitialized] =
    useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(dateRangeKey)
    if (!stored) return
    if (
      stored === 'current-month' ||
      stored === '3-months' ||
      stored === 'custom'
    ) {
      setQuickSelectionState(stored)
    }
  }, [
    dateRangeKey
  ])

  useEffect(() => {
    if (!accounts || isAccountSelectionInitialized) return

    const stored = localStorage.getItem(accountSelectionKey)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          const validIds = parsed.filter((id) =>
            accounts.some((account) => account.id === id)
          )
          setSelectedAccountIds(
            validIds.length > 0
              ? validIds
              : accounts.map((account) => account.id)
          )
          setIsAccountSelectionInitialized(true)
          return
        }
      } catch {
        // Ignore invalid localStorage values and fall back to default.
      }
    }

    setSelectedAccountIds(accounts.map((account) => account.id))
    setIsAccountSelectionInitialized(true)
  }, [
    accounts,
    isAccountSelectionInitialized,
    accountSelectionKey
  ])

  const setQuickSelection = (value: DateRangeOption) => {
    setQuickSelectionState(value)
    localStorage.setItem(dateRangeKey, value)
  }

  const updateSelectedAccounts = (newIds: string[]) => {
    setSelectedAccountIds(newIds)
    localStorage.setItem(accountSelectionKey, JSON.stringify(newIds))
  }

  const setCustomDateRange = (start?: Date, end?: Date) => {
    setCustomStartDate(start)
    setCustomEndDate(end)
    if (start || end) {
      setQuickSelection('custom')
    }
  }

  return {
    quickSelection,
    setQuickSelection,
    customStartDate,
    customEndDate,
    setCustomDateRange,
    selectedAccountIds,
    updateSelectedAccounts
  }
}
