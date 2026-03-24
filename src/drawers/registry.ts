import type { ColumnFiltersState } from '@tanstack/react-table'
import type { ComponentType } from 'react'

import type { TransactionType } from '@/api/generated/types.gen'
import { CreateTransactionDrawer } from './drawers/create-transaction-drawer'
import { DashboardChartSettingsDrawer } from './drawers/dashboard-chart-settings-drawer'
import { TransactionsTableFilterDrawer } from './drawers/transactions-table-filter-drawer'

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
  transactionsTableFilterDrawer: {
    columnFilters: ColumnFiltersState
    onApply: (filters: ColumnFiltersState) => void
    /** Transaction types that exist in the current dataset (controls which checkboxes appear). */
    availableTransactionTypes: TransactionType[]
  }
  createTransaction: Record<string, never>
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
  },
  transactionsTableFilterDrawer: {
    title: 'Filtrera'
  },
  createTransaction: {
    title: 'Skapa transaktion',
    description:
      'En transaktion är en debitering eller kreditering på dina konton.'
  }
} satisfies DrawerMeta

export const drawerComponents = {
  dashboardChartSettings: DashboardChartSettingsDrawer,
  transactionsTableFilterDrawer: TransactionsTableFilterDrawer,
  createTransaction: CreateTransactionDrawer
} satisfies {
  [K in keyof DrawerPropsMap]: ComponentType<
    DrawerPropsMap[K] & {
      onClose: () => void
    }
  >
}
