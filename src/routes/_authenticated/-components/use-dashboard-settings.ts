import { useEffect, useMemo, useRef, useState } from 'react'
import type { DateRangeOption } from '@/lib/dashboard-utils'

const STORAGE_PREFIX = 'yoshi-dashboard-settings-v1'

function sameAccountIdSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const setB = new Set(b)
  return a.every((id) => setB.has(id))
}

type AccountLike = {
  id: string
}

type UseDashboardSettingsParams = {
  userId: string
  accounts: AccountLike[] | undefined
}

export type UseDashboardSettingsResult = {
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
  /** Last known full account id list; used to detect "all accounts" chart selection after new accounts appear. */
  const prevAllAccountIdsRef = useRef<string[] | null>(null)

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
          const initial =
            validIds.length > 0
              ? validIds
              : accounts.map((account) => account.id)
          setSelectedAccountIds(initial)
          prevAllAccountIdsRef.current = accounts.map((account) => account.id)
          setIsAccountSelectionInitialized(true)
          return
        }
      } catch {
        // Ignore invalid localStorage values and fall back to default.
      }
    }

    const allIds = accounts.map((account) => account.id)
    setSelectedAccountIds(allIds)
    prevAllAccountIdsRef.current = allIds
    setIsAccountSelectionInitialized(true)
  }, [
    accounts,
    isAccountSelectionInitialized,
    accountSelectionKey
  ])

  useEffect(() => {
    if (!accounts || !isAccountSelectionInitialized) return

    const allIds = accounts.map((a) => a.id)
    const allIdsSet = new Set(allIds)
    const prevAllIds = prevAllAccountIdsRef.current

    if (!prevAllIds) {
      prevAllAccountIdsRef.current = allIds
      return
    }

    setSelectedAccountIds((prev) => {
      const pruned = prev.filter((id) => allIdsSet.has(id))
      const hadFullSelection = sameAccountIdSet(prev, prevAllIds)
      const next =
        hadFullSelection ? allIds : pruned.length > 0 ? pruned : allIds

      if (sameAccountIdSet(next, prev)) {
        return prev
      }

      localStorage.setItem(accountSelectionKey, JSON.stringify(next))
      return next
    })

    prevAllAccountIdsRef.current = allIds
  }, [accounts, isAccountSelectionInitialized, accountSelectionKey])

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
