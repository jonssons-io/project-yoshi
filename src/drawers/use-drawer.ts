import { useContext } from 'react'

import { DrawerContext } from './provider'

/**
 * Returns the typed drawer API. Must be used under {@link DrawerProvider}.
 */
export function useDrawer() {
  const ctx = useContext(DrawerContext)
  if (!ctx) {
    throw new Error('useDrawer must be used within DrawerProvider')
  }
  return ctx
}
