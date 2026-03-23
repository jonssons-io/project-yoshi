/**
 * Application Sidebar
 * Main navigation sidebar with a flat route hierarchy.
 */

import { Link } from '@tanstack/react-router'
import {
  ArrowLeftRight,
  BadgeAlert,
  CalendarIcon,
  ChartSpline,
  Grid2X2,
  HandCoins,
  ReceiptText
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SidebarUserMenu } from '@/components/sidebar-user-menu/sidebar-user-menu'
import { Sidebar } from '@/components/ui/sidebar'

type AppSidebarProps = {
  user: {
    imageUrl?: string
    fullName?: string | null
    firstName?: string | null
    email?: string
  }
  households?: {
    id: string
    name: string
  }[]
  selectedHouseholdId: string | null
  onSelectHousehold: (id: string) => void
  onCreateHousehold: () => void
  onEditHousehold: () => void
  onShowInvitations: () => void
  onSignOut: () => void
}

export function AppSidebar({
  user,
  households,
  selectedHouseholdId,
  onSelectHousehold,
  onCreateHousehold,
  onEditHousehold,
  onShowInvitations,
  onSignOut
}: AppSidebarProps) {
  const { t } = useTranslation()

  const navItems = [
    {
      title: t('nav.dashboard'),
      url: '/',
      icon: ChartSpline
    },
    {
      title: t('nav.transactions'),
      url: '/transactions',
      icon: ArrowLeftRight
    },
    {
      title: t('nav.income'),
      url: '/income',
      icon: HandCoins
    },
    {
      title: t('nav.bills'),
      url: '/bills',
      icon: ReceiptText
    },
    {
      title: t('nav.categories'),
      url: '/categories',
      icon: Grid2X2
    },
    {
      title: t('nav.accounts'),
      url: '/accounts',
      icon: BadgeAlert
    },
    {
      title: t('nav.budgets'),
      url: '/budgets',
      icon: BadgeAlert
    }
  ]

  return (
    <Sidebar>
      <div className="flex h-full min-h-0 flex-1 flex-col justify-between gap-8">
        <div className="flex flex-col gap-8">
          <Link
            to="/"
            activeOptions={{
              exact: true
            }}
            className="px-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-md bg-purple-500 text-white">
                <span
                  className="text-[1.5rem] leading-none font-medium"
                  style={{
                    fontFamily: 'var(--font-nunito-sans)'
                  }}
                >
                  {t('common.appLogo')}
                </span>
              </div>
              <div className="flex flex-col">
                <span
                  className="leading-5 text-black"
                  style={{
                    fontFamily: 'var(--font-nunito-sans)',
                    fontSize: '0.875rem',
                    fontWeight: 700
                  }}
                >
                  {t('common.appName')}
                </span>
                <span
                  className="leading-4 text-black"
                  style={{
                    fontFamily: 'var(--font-nunito-sans)',
                    fontSize: '0.75rem',
                    fontWeight: 400
                  }}
                >
                  {t('common.appDescription')}
                </span>
              </div>
            </div>
          </Link>

          <div className="flex flex-col gap-2 px-4">
            <span className="type-label text-black">{t('common.date')}</span>
            <button
              type="button"
              className="type-label flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-black"
            >
              <span>{t('dashboard.currentMonth')}</span>
              <CalendarIcon className="size-4 shrink-0 stroke-[1.5]" />
            </button>
          </div>

          <nav aria-label={t('dashboard.sidebar')}>
            <ul className="flex flex-col gap-2">
              {navItems.map((item) => (
                <li key={item.url}>
                  <Link
                    to={item.url}
                    activeOptions={{
                      exact: item.url === '/'
                    }}
                    activeProps={{
                      className: 'bg-purple-800 text-white'
                    }}
                    inactiveProps={{
                      className: 'bg-transparent text-black'
                    }}
                    className="type-label flex w-full items-center gap-2 rounded-none px-4 py-2 outline-hidden focus-visible:ring-2 focus-visible:ring-purple-800"
                  >
                    <item.icon className="size-4 shrink-0 stroke-[1.5]" />
                    <span>{item.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="border-t border-gray-300">
          <SidebarUserMenu
            user={user}
            households={households}
            selectedHouseholdId={selectedHouseholdId}
            onSelectHousehold={onSelectHousehold}
            onCreateHousehold={onCreateHousehold}
            onEditHousehold={onEditHousehold}
            onShowInvitations={onShowInvitations}
            onSignOut={onSignOut}
          />
        </div>
      </div>
    </Sidebar>
  )
}
