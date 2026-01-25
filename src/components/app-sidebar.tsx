/**
 * Application Sidebar
 * Main navigation sidebar with icons and labels
 */

import { useUser } from '@clerk/clerk-react'
import { Link } from '@tanstack/react-router'
import {
	Calendar,
	Check,
	ChevronsUpDown,
	Coins,
	CreditCard,
	FileTextIcon,
	Home,
	Receipt,
	Tags,
	Wallet
} from 'lucide-react'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem
} from '@/components/ui/sidebar'
import { useBudgetsList } from '@/hooks/api'
import { useSelectedBudget } from '@/hooks/use-selected-budget'
import { useSelectedHousehold } from '@/hooks/use-selected-household'
import { cn } from '@/lib/utils'

const navSections = {
	overview: [
		{
			title: 'Dashboard',
			url: '/',
			icon: Home,
			requiresBudget: false
		}
	],
	budget: [
		{
			title: 'Transactions',
			url: '/transactions',
			icon: Receipt,
			requiresBudget: true
		},
		{
			title: 'Bills',
			url: '/bills',
			icon: FileTextIcon,
			requiresBudget: true
		}
	],
	household: [
		{
			title: 'Income',
			url: '/income',
			icon: Coins,
			requiresBudget: true
		},
		{
			title: 'Budgets',
			url: '/budgets',
			icon: Wallet,
			requiresBudget: false
		},
		{
			title: 'Plan',
			url: '/plan',
			icon: Calendar,
			requiresBudget: true
		},
		{
			title: 'Accounts',
			url: '/accounts',
			icon: CreditCard,
			requiresBudget: false
		},
		{
			title: 'Categories',
			url: '/categories',
			icon: Tags,
			requiresBudget: false
		}
	]
}

export function AppSidebar() {
	const { user } = useUser()
	const userId = user?.id!
	const { selectedHouseholdId } = useSelectedHousehold(userId)
	const { selectedBudgetId, setSelectedBudget } = useSelectedBudget(
		userId,
		selectedHouseholdId ?? undefined
	)

	// Fetch budgets for selected household
	const { data: budgets } = useBudgetsList({
		householdId: selectedHouseholdId!,
		userId,
		enabled: !!selectedHouseholdId
	})

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
									<span className="text-xs text-muted-foreground">
										Budget App
									</span>
								</div>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				{/* Household Selector - REMOVED (Moved to Header) */}

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
										<DropdownMenuContent
											className="w-[--radix-dropdown-menu-trigger-width]"
											align="start"
										>
											{budgets.map((budget) => (
												<DropdownMenuItem
													key={budget.id}
													onClick={() => setSelectedBudget(budget.id)}
												>
													<Check
														className={cn(
															'mr-2 h-4 w-4',
															selectedBudgetId === budget.id
																? 'opacity-100'
																: 'opacity-0'
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
											search={
												item.requiresBudget && selectedBudgetId
													? { budgetId: selectedBudgetId }
													: undefined
											}
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
												search={
													item.requiresBudget && selectedBudgetId
														? { budgetId: selectedBudgetId }
														: undefined
												}
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

				{/* Household Section */}
				<SidebarGroup>
					<SidebarGroupLabel>Household</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{navSections.household.map((item) => (
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
