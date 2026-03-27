import { useContext } from 'react'

import { DrawerActionsContext } from './provider'

/**
 * Returns stable drawer actions. Must be used under {@link DrawerProvider}.
 */
export function useDrawer() {
  const ctx = useContext(DrawerActionsContext)
  if (!ctx) {
    throw new Error('useDrawer must be used within DrawerProvider')
  }
  return ctx
}
