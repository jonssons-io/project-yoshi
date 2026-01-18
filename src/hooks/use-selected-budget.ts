/**
 * Hook to get and set the currently selected budget
 * Uses localStorage to persist the selection
 */

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'yoshi-selected-budget'

export function useSelectedBudget() {
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY)
    }
    return null
  })

  const setSelectedBudget = (budgetId: string | null) => {
    setSelectedBudgetId(budgetId)
    if (budgetId) {
      localStorage.setItem(STORAGE_KEY, budgetId)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  // Sync with localStorage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setSelectedBudgetId(e.newValue)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  return {
    selectedBudgetId,
    setSelectedBudget,
  }
}
