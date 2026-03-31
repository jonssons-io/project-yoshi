import type { ColumnFiltersState } from '@tanstack/react-table'
import type { ComponentType } from 'react'

import type {
  BillPaymentHandling,
  RecurrenceType,
  TransactionType
} from '@/api/generated/types.gen'
import type { BillOverviewStatus } from '@/routes/_authenticated/bills/-components/bill-overview-table'
import type { IncomeOverviewStatus } from '@/routes/_authenticated/income/-components/income-overview-table'
import { AllocateBudgetDrawer } from './drawers/allocate-budget-drawer'
import { BillBasisFilterDrawer } from './drawers/bill-basis-filter-drawer'
import { BillOverviewFilterDrawer } from './drawers/bill-overview-filter-drawer'
import { CreateAccountDrawer } from './drawers/create-account-drawer'
import { CreateBillDrawer } from './drawers/create-bill-drawer'
import { CreateBudgetDrawer } from './drawers/create-budget-drawer'
import { CreateIncomeDrawer } from './drawers/create-income-drawer/create-income-drawer'
import { CreateTransactionDrawer } from './drawers/create-transaction-drawer'
import { DashboardChartSettingsDrawer } from './drawers/dashboard-chart-settings-drawer'
import { DeallocateBudgetDrawer } from './drawers/deallocate-budget-drawer'
import { EditAccountDrawer } from './drawers/edit-account-drawer'
import { EditBudgetDrawer } from './drawers/edit-budget-drawer'
import { EditIncomeBlueprintDrawer } from './drawers/edit-income-blueprint-drawer'
import { EditIncomeInstanceDrawer } from './drawers/edit-income-instance-drawer'
import { IncomeSourceFilterDrawer } from './drawers/income-source-filter-drawer'
import { IncomeTableFilterDrawer } from './drawers/income-table-filter-drawer'
import { TransactionsTableFilterDrawer } from './drawers/transactions-table-filter-drawer'
import { TransferBudgetAllocationDrawer } from './drawers/transfer-budget-allocation-drawer'

/**
 * Single source of truth for typed drawers. To add a drawer:
 * 1. Extend `DrawerPropsMap` with a unique key and its props type.
 * 2. Add matching `{ titleKey, descriptionKey?, titleParams?, … }` in `drawerMeta` (keys in `sv.json` under `drawers`).
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
    availableTransactionTypes: TransactionType[]
    availableAccounts: Array<{
      value: string
      label: string
    }>
    availableBudgets: Array<{
      value: string
      label: string
    }>
    availableCategories: Array<{
      value: string
      label: string
    }>
    availableRecipientsSenders: Array<{
      value: string
      label: string
    }>
    amountBounds: {
      min?: number
      max?: number
    }
  }
  incomeTableFilterDrawer: {
    columnFilters: ColumnFiltersState
    onApply: (filters: ColumnFiltersState) => void
    availableStatuses: Array<{
      value: IncomeOverviewStatus
      label: string
    }>
    availableAccounts: Array<{
      value: string
      label: string
    }>
    availableCategories: Array<{
      value: string
      label: string
    }>
    availableSenders: Array<{
      value: string
      label: string
    }>
    amountBounds: {
      min?: number
      max?: number
    }
  }
  createTransaction: {
    incomeInstance?: {
      instanceId: string
      name: string
      amount: number
      date: Date
      accountId: string
      categoryId: string | null
      senderName: string
    }
    billInstance?: {
      instanceId: string
      name: string
      amount: number
      date: Date
      accountId: string | null
      categoryId: string | null
      budgetId: string | null
      recipientId: string
    }
  }
  createIncome: Record<string, never>
  createBill: Record<string, never>
  createBudget: Record<string, never>
  createAccount: Record<string, never>
  allocateBudget: {
    budgetId: string
    budgetName: string
    currentAllocation: number
    availableToAllocate: number
  }
  deallocateBudget: {
    budgetId: string
    budgetName: string
    currentAllocation: number
  }
  transferBudgetAllocation: {
    budgets: {
      id: string
      name: string
      allocatedAmount: number
    }[]
    initialFromBudgetId: string
  }
  editBudget: {
    id: string
  }
  editAccount: {
    id: string
  }
  editIncomeInstance: {
    instanceId: string
  }
  editIncomeBlueprintUpcoming: {
    incomeId: string
    mode: 'upcoming'
  }
  editIncomeBlueprintAll: {
    incomeId: string
    mode: 'all'
  }
  incomeSourceFilterDrawer: {
    columnFilters: ColumnFiltersState
    onApply: (filters: ColumnFiltersState) => void
    availableRecurrences: Array<{
      value: RecurrenceType
      label: string
    }>
    availableAccounts: Array<{
      value: string
      label: string
    }>
    availableCategories: Array<{
      value: string
      label: string
    }>
    availableSenders: Array<{
      value: string
      label: string
    }>
    amountBounds: {
      min?: number
      max?: number
    }
  }
  billOverviewFilterDrawer: {
    columnFilters: ColumnFiltersState
    onApply: (filters: ColumnFiltersState) => void
    availableStatuses: Array<{
      value: BillOverviewStatus
      label: string
    }>
    availableHandlings: Array<{
      value: BillPaymentHandling
      label: string
    }>
    availableAccounts: Array<{
      value: string
      label: string
    }>
    availableBudgets: Array<{
      value: string
      label: string
    }>
    availableCategories: Array<{
      value: string
      label: string
    }>
    availableRecipients: Array<{
      value: string
      label: string
    }>
    amountBounds: {
      min?: number
      max?: number
    }
  }
  billBasisFilterDrawer: {
    columnFilters: ColumnFiltersState
    onApply: (filters: ColumnFiltersState) => void
    availableRecurrences: Array<{
      value: RecurrenceType
      label: string
    }>
    availableHandlings: Array<{
      value: BillPaymentHandling
      label: string
    }>
    availableAccounts: Array<{
      value: string
      label: string
    }>
    availableBudgets: Array<{
      value: string
      label: string
    }>
    availableCategories: Array<{
      value: string
      label: string
    }>
    availableRecipients: Array<{
      value: string
      label: string
    }>
    amountBounds: {
      min?: number
      max?: number
    }
  }
}

export type DrawerName = keyof DrawerPropsMap

export type DrawerMetaEntry<
  K extends keyof DrawerPropsMap = keyof DrawerPropsMap
> = {
  titleKey: string
  descriptionKey?: string
  titleParams?: (props: DrawerPropsMap[K]) => Record<string, unknown>
  descriptionParams?: (props: DrawerPropsMap[K]) => Record<string, unknown>
}

export type DrawerMeta = {
  [K in keyof DrawerPropsMap]: DrawerMetaEntry<K>
}

export const drawerMeta = {
  dashboardChartSettings: {
    titleKey: 'drawers.dashboardChartSettings.title'
  },
  transactionsTableFilterDrawer: {
    titleKey: 'drawers.transactionsTableFilterDrawer.title'
  },
  incomeTableFilterDrawer: {
    titleKey: 'drawers.incomeTableFilterDrawer.title'
  },
  createTransaction: {
    titleKey: 'drawers.createTransaction.title',
    descriptionKey: 'drawers.createTransaction.description'
  },
  createIncome: {
    titleKey: 'drawers.createIncome.title',
    descriptionKey: 'drawers.shared.incomeDescription'
  },
  createBill: {
    titleKey: 'drawers.createBill.title',
    descriptionKey: 'drawers.createBill.description'
  },
  createBudget: {
    titleKey: 'drawers.createBudget.title',
    descriptionKey: 'drawers.shared.budgetDescription'
  },
  createAccount: {
    titleKey: 'drawers.createAccount.title',
    descriptionKey: 'drawers.shared.accountDescription'
  },
  allocateBudget: {
    titleKey: 'drawers.allocateBudget.title',
    descriptionKey: 'drawers.shared.budgetDescription',
    titleParams: ({ budgetName }) => ({
      budgetName
    })
  },
  deallocateBudget: {
    titleKey: 'drawers.deallocateBudget.title',
    descriptionKey: 'drawers.shared.budgetDescription',
    titleParams: ({ budgetName }) => ({
      budgetName
    })
  },
  transferBudgetAllocation: {
    titleKey: 'drawers.transferBudgetAllocation.title',
    descriptionKey: 'drawers.shared.budgetDescription'
  },
  editBudget: {
    titleKey: 'drawers.editBudget.title',
    descriptionKey: 'drawers.shared.budgetDescription'
  },
  editAccount: {
    titleKey: 'drawers.editAccount.title',
    descriptionKey: 'drawers.shared.accountDescription'
  },
  editIncomeInstance: {
    titleKey: 'drawers.editIncomeInstance.title',
    descriptionKey: 'drawers.shared.incomeDescription'
  },
  editIncomeBlueprintUpcoming: {
    titleKey: 'drawers.editIncomeBlueprintUpcoming.title',
    descriptionKey: 'drawers.editIncomeBlueprintUpcoming.description'
  },
  editIncomeBlueprintAll: {
    titleKey: 'drawers.editIncomeBlueprintAll.title',
    descriptionKey: 'drawers.editIncomeBlueprintAll.description'
  },
  incomeSourceFilterDrawer: {
    titleKey: 'drawers.incomeSourceFilterDrawer.title'
  },
  billOverviewFilterDrawer: {
    titleKey: 'drawers.billOverviewFilterDrawer.title'
  },
  billBasisFilterDrawer: {
    titleKey: 'drawers.billBasisFilterDrawer.title'
  }
} satisfies DrawerMeta

export const drawerComponents = {
  dashboardChartSettings: DashboardChartSettingsDrawer,
  transactionsTableFilterDrawer: TransactionsTableFilterDrawer,
  incomeTableFilterDrawer: IncomeTableFilterDrawer,
  createTransaction: CreateTransactionDrawer,
  createIncome: CreateIncomeDrawer,
  createBill: CreateBillDrawer,
  createBudget: CreateBudgetDrawer,
  createAccount: CreateAccountDrawer,
  allocateBudget: AllocateBudgetDrawer,
  deallocateBudget: DeallocateBudgetDrawer,
  transferBudgetAllocation: TransferBudgetAllocationDrawer,
  editBudget: EditBudgetDrawer,
  editAccount: EditAccountDrawer,
  editIncomeInstance: EditIncomeInstanceDrawer,
  editIncomeBlueprintUpcoming: EditIncomeBlueprintDrawer,
  editIncomeBlueprintAll: EditIncomeBlueprintDrawer,
  incomeSourceFilterDrawer: IncomeSourceFilterDrawer,
  billOverviewFilterDrawer: BillOverviewFilterDrawer,
  billBasisFilterDrawer: BillBasisFilterDrawer
} satisfies {
  [K in keyof DrawerPropsMap]: ComponentType<
    DrawerPropsMap[K] & {
      onClose: () => void
    }
  >
}
