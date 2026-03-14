/**
 * Application Sidebar
 * Main navigation sidebar with icons and labels
 */

import { Link } from '@tanstack/react-router'
import {
  Coins,
  CreditCard,
  FileTextIcon,
  Home,
  Receipt,
  Tags,
  Wallet
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
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

export function AppSidebar() {
  const { t } = useTranslation()

  const navSections = {
    overview: [
      {
        title: t('nav.dashboard'),
        url: '/',
        icon: Home
      }
    ],
    budget: [
      {
        title: t('nav.transactions'),
        url: '/transactions',
        icon: Receipt
      },

      {
        title: t('nav.accounts'),
        url: '/accounts',
        icon: CreditCard
      },
      {
        title: t('nav.budgets'),
        url: '/budgets',
        icon: Wallet
      }
    ],
    household: [
      {
        title: t('nav.categories'),
        url: '/categories',
        icon: Tags
      },
      {
        title: t('nav.bills'),
        url: '/bills',
        icon: FileTextIcon
      },
      {
        title: t('nav.income'),
        url: '/income',
        icon: Coins
      }
    ]
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
            >
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <span className="text-xl font-bold">
                    {t('common.appLogo')}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">{t('common.appName')}</span>
                  <span className="text-xs text-muted-foreground">
                    {t('common.appDescription')}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {/* Household Selector - REMOVED (Moved to Header) */}

        {/* Overview Section */}
        <SidebarGroup>
          <SidebarGroupLabel>{t('nav.dashboard')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navSections.overview.map((item) => (
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

        {/* Budget Management Section */}
        <SidebarGroup>
          <SidebarGroupLabel>{t('nav.budgetManagement')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navSections.budget.map((item) => (
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

        {/* Household Section */}
        <SidebarGroup>
          <SidebarGroupLabel>{t('nav.household')}</SidebarGroupLabel>
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
