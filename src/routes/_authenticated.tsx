import { useClerk, useUser } from '@clerk/clerk-react'
import { useAuth } from '@clerk/tanstack-react-start'
import { auth } from '@clerk/tanstack-react-start/server'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { format, subDays } from 'date-fns'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { configureApiClient } from '@/api/client-config'
import { AppSidebar } from '@/components/app-sidebar'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger
} from '@/components/ui/sidebar'
import { AuthProvider } from '@/contexts/auth-context'
import { HouseholdProvider } from '@/contexts/household-context'
import { useSelectedHousehold } from '@/hooks/use-selected-household'

import { AuthenticatedOutlet } from './_authenticated/authenticated-outlet'

const authStateFn = createServerFn().handler(async () => {
  const { userId } = await auth()

  if (!userId) {
    throw redirect({
      to: '/sign-in'
    })
  }

  return {
    userId
  }
})

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const dateRangeSearchSchema = z.object({
  from: z
    .string()
    .regex(DATE_PATTERN)
    .catch(() => format(subDays(new Date(), 29), 'yyyy-MM-dd')),
  to: z
    .string()
    .regex(DATE_PATTERN)
    .catch(() => format(new Date(), 'yyyy-MM-dd'))
})

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => await authStateFn(),
  component: AuthenticatedLayout,
  validateSearch: (search) => dateRangeSearchSchema.parse(search)
})

function AuthenticatedLayout() {
  return <AuthenticatedLayoutContent />
}

function AuthenticatedLayoutContent() {
  const { t } = useTranslation()
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()
  const { signOut } = useClerk()
  const userId = user?.id
  useEffect(() => {
    if (!isLoaded) return
    configureApiClient(getToken)
  }, [
    isLoaded,
    getToken
  ])

  const {
    households,
    selectedHouseholdId,
    setSelectedHousehold,
    isLoading: isHouseholdsLoading
  } = useSelectedHousehold(userId, isLoaded)

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  }

  if (!userId) {
    return null
  }

  const handleCreateHousehold = () => {
    void 0
  }

  const handleEditHousehold = () => {
    void 0
  }

  const handleShowInvitations = () => {
    void 0
  }

  const handleSignOut = () => {
    signOut()
  }

  return (
    <HouseholdProvider
      value={{
        userId,
        households,
        selectedHouseholdId,
        setSelectedHousehold,
        isHouseholdsLoading
      }}
    >
      <SidebarProvider>
        <SidebarTrigger className="fixed top-4 left-4 z-50" />
        <AppSidebar
          user={{
            imageUrl: user.imageUrl,
            fullName: user.fullName,
            firstName: user.firstName,
            email: user.primaryEmailAddress?.emailAddress
          }}
          households={households}
          selectedHouseholdId={selectedHouseholdId}
          onSelectHousehold={setSelectedHousehold}
          onCreateHousehold={handleCreateHousehold}
          onEditHousehold={handleEditHousehold}
          onShowInvitations={handleShowInvitations}
          onSignOut={handleSignOut}
        />
        <SidebarInset>
          <AuthProvider>
            <AuthenticatedOutlet />
          </AuthProvider>
        </SidebarInset>
      </SidebarProvider>
    </HouseholdProvider>
  )
}
