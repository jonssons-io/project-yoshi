import { useClerk, useUser } from '@clerk/clerk-react'
import { useAuth } from '@clerk/tanstack-react-start'
import { auth } from '@clerk/tanstack-react-start/server'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
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

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => await authStateFn(),
  component: AuthenticatedLayout
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
      <div className="flex min-h-[60vh] items-center justify-center">
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
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <AuthProvider>
              <Outlet />
            </AuthProvider>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </HouseholdProvider>
  )
}
