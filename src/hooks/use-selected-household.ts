import { useState, useEffect } from 'react'

const STORAGE_KEY = 'yoshi-selected-household-id'

/**
 * Custom hook to manage and persist the selected household ID
 * Similar to useSelectedBudget, but for households
 */
export function useSelectedHousehold() {
  const [selectedHouseholdId, setSelectedHouseholdIdState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      setSelectedHouseholdIdState(stored)
    }
    setIsLoading(false)
  }, [])

  // Update localStorage when selection changes
  const setSelectedHousehold = (householdId: string | null) => {
    setSelectedHouseholdIdState(householdId)
    if (householdId) {
      localStorage.setItem(STORAGE_KEY, householdId)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  return {
    selectedHouseholdId,
    setSelectedHousehold,
    isLoading,
  }
}
