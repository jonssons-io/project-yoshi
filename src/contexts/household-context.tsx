import { createContext, type ReactNode, useContext, useMemo } from 'react'
import type { Household } from '@/api/generated/types.gen'

type NormalizedHousehold = Omit<Household, 'createdAt'> & {
  createdAt: Date
}

/**
 * Layout-level context providing household data to all authenticated components
 * (sidebar, header, main content). Single source of truth for household selection.
 */
interface HouseholdContextValue {
  userId: string
  households: NormalizedHousehold[] | undefined
  selectedHouseholdId: string | null
  setSelectedHousehold: (id: string | null) => void
  isHouseholdsLoading: boolean
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null)

interface HouseholdProviderProps {
  value: HouseholdContextValue
  children: ReactNode
}

export function HouseholdProvider({ value, children }: HouseholdProviderProps) {
  const {
    userId,
    households,
    selectedHouseholdId,
    setSelectedHousehold,
    isHouseholdsLoading
  } = value

  const stable = useMemo(
    () => ({
      userId,
      households,
      selectedHouseholdId,
      setSelectedHousehold,
      isHouseholdsLoading
    }),
    [
      userId,
      households,
      selectedHouseholdId,
      setSelectedHousehold,
      isHouseholdsLoading
    ]
  )

  return (
    <HouseholdContext.Provider value={stable}>
      {children}
    </HouseholdContext.Provider>
  )
}

/**
 * Access household data from the layout-level context.
 * Must be used within a HouseholdProvider.
 *
 * @throws Error if used outside of HouseholdProvider
 */
export function useHouseholdContext(): HouseholdContextValue {
  const context = useContext(HouseholdContext)
  if (!context) {
    throw new Error(
      'useHouseholdContext must be used within a HouseholdProvider'
    )
  }
  return context
}
