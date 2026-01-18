/**
 * Application Sidebar
 * Main navigation sidebar with icons and labels
 */

import { Home, Wallet, Tags, CreditCard, Receipt, FileTextIcon, ChevronsUpDown, Check, Building2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useTRPC } from '@/integrations/trpc/react'
import { useQuery } from '@tanstack/react-query'
import { useSelectedHousehold } from '@/hooks/use-selected-household'
import { useSelectedBudget } from '@/hooks/use-selected-budget'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const MOCK_USER_ID = 'demo-user-123'

const navSections = {
  overview: [
    {
      title: 'Dashboard',
      url: '/',
      icon: Home,
      requiresBudget: false,
    },
    {
      title: 'Households',
      url: '/households',
      icon: Building2,
      requiresBudget: false,
    },
    {
      title: 'Budgets',
      url: '/budgets',
      icon: Wallet,
      requiresBudget: false,
    },
  ],
  budget: [
    {
      title: 'Transactions',
      url: '/transactions',
      icon: Receipt,
      requiresBudget: true,
    },
    {
      title: 'Bills',
      url: '/bills',
      icon: FileTextIcon,
      requiresBudget: true,
    },
  ],
  settings: [
    {
      title: 'Accounts',
      url: '/accounts',
      icon: CreditCard,
      requiresBudget: false,
    },
    {
      title: 'Categories',
      url: '/categories',
      icon: Tags,
      requiresBudget: false,
    },
  ],
}

export function AppSidebar() {
  const { user } = useUser()
  const userId = user?.id ?? MOCK_USER_ID
  const trpc = useTRPC()
  const { selectedHouseholdId, setSelectedHousehold } = useSelectedHousehold()
  const { selectedBudgetId, setSelectedBudget } = useSelectedBudget()

  // Fetch households
  const { data: households } = useQuery({
    ...trpc.households.list.queryOptions({ userId }),
    enabled: true,
  })

  // Auto-select first household if none selected
  useEffect(() => {
    if (households && households.length > 0 && !selectedHouseholdId) {
      setSelectedHousehold(households[0].id)
    }
  }, [households, selectedHouseholdId, setSelectedHousehold])

  // Fetch budgets for selected household
  const { data: budgets } = useQuery({
    ...trpc.budgets.list.queryOptions({
      householdId: selectedHouseholdId!,
      userId,
    }),
    enabled: !!selectedHouseholdId,
  })

  // Auto-select first budget if none selected
  useEffect(() => {
    if (budgets && budgets.length > 0 && !selectedBudgetId) {
      setSelectedBudget(budgets[0].id)
    }
  }, [budgets, selectedBudgetId, setSelectedBudget])

  const selectedHousehold = households?.find((h) => h.id === selectedHouseholdId)
  const selectedBudget = budgets?.find((b) => b.id === selectedBudgetId)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <span className="text-xl font-bold">Y</span>
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Yoshi</span>
                  <span className="text-xs text-muted-foreground">Budget App</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {/* Household Selector */}
        {households && households.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Household</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton className="w-full">
                        <Building2 className="h-4 w-4" />
                        <span className="flex-1 truncate text-left">
                          {selectedHousehold?.name ?? 'Select Household'}
                        </span>
                        <ChevronsUpDown className="ml-auto h-4 w-4 opacity-50" />
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]" align="start">
                      {households.map((household) => (
                        <DropdownMenuItem
                          key={household.id}
                          onClick={() => setSelectedHousehold(household.id)}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              selectedHouseholdId === household.id ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          {household.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Budget Selector (only shown if household is selected) */}
        {selectedHouseholdId && budgets && budgets.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Active Budget</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton className="w-full">
                        <Wallet className="h-4 w-4" />
                        <span className="flex-1 truncate text-left">
                          {selectedBudget?.name ?? 'Select Budget'}
                        </span>
                        <ChevronsUpDown className="ml-auto h-4 w-4 opacity-50" />
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]" align="start">
                      {budgets.map((budget) => (
                        <DropdownMenuItem
                          key={budget.id}
                          onClick={() => setSelectedBudget(budget.id)}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              selectedBudgetId === budget.id ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          {budget.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Overview Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navSections.overview.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link
                      to={item.url}
                      search={item.requiresBudget && selectedBudgetId ? { budgetId: selectedBudgetId } : undefined}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Budget Management Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Budget Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navSections.budget.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {selectedBudgetId ? (
                    <SidebarMenuButton asChild>
                      <Link
                        to={item.url}
                        search={item.requiresBudget && selectedBudgetId ? { budgetId: selectedBudgetId } : undefined}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton disabled>
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navSections.settings.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
