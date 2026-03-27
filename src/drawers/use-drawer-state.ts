import { useContext } from 'react'

import { DrawerStateContext } from './provider'

/**
 * Returns drawer lifecycle state for flows that need to react to open/close settling.
 */
export function useDrawerState() {
  const ctx = useContext(DrawerStateContext)
  if (!ctx) {
    throw new Error('useDrawerState must be used within DrawerProvider')
  }
  return ctx
}
