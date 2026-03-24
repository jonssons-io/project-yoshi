import type { ComponentType } from 'react'

import { DashboardChartSettingsDrawer } from './drawers/dashboard-chart-settings-drawer'

/**
 * Single source of truth for typed drawers. To add a drawer:
 * 1. Extend `DrawerPropsMap` with a unique key and its props type.
 * 2. Add matching `{ title, description? }` in `drawerMeta`.
 * 3. Register the component in `drawerComponents` (props + `onClose` injected by the provider).
 */
export type DrawerPropsMap = {
  dashboardChartSettings: {
    accounts: {
      id: string
      name: string
    }[]
    selectedAccountIds: string[]
    onApply: (accountIds: string[]) => void
  }
}

export type DrawerName = keyof DrawerPropsMap

export type DrawerMeta = {
  [K in keyof DrawerPropsMap]: {
    title: string
    description?: string
  }
}

export const drawerMeta = {
  dashboardChartSettings: {
    title: 'Diagraminställningar'
  }
} satisfies DrawerMeta

export const drawerComponents = {
  dashboardChartSettings: DashboardChartSettingsDrawer
} satisfies {
  [K in keyof DrawerPropsMap]: ComponentType<
    DrawerPropsMap[K] & {
      onClose: () => void
    }
  >
}
