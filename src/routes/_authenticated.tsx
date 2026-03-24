import { useClerk, useUser } from '@clerk/clerk-react'
import { useAuth } from '@clerk/tanstack-react-start'
import { auth } from '@clerk/tanstack-react-start/server'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { configureApiClient } from '@/api/client-config'
import { AppSidebar } from '@/components/app-sidebar'
import { DrawerProvider } from '@/components/drawer-context'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger
} from '@/components/ui/sidebar'
import { AuthProvider } from '@/contexts/auth-context'
import { HouseholdProvider } from '@/contexts/household-context'
import { HouseholdForm } from '@/forms/HouseholdForm'
import {
  useCreateHousehold,
  useDeleteHousehold,
  useUpdateHousehold
} from '@/hooks/api'
import { useConfirmDialog } from '@/hooks/use-confirm-dialog'
import { useDrawer } from '@/hooks/use-drawer'
import { useSelectedHousehold } from '@/hooks/use-selected-household'
import { getErrorMessage } from '@/lib/api-error'
import { PendingInvitations } from '@/routes/_authenticated/-components/pending-invitations'

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
  return (
    <DrawerProvider>
      <AuthenticatedLayoutContent />
    </DrawerProvider>
  )
}

function AuthenticatedLayoutContent() {
  const { t } = useTranslation()
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()
  const { signOut } = useClerk()
  const userId = user?.id
  const { openDrawer, closeDrawer } = useDrawer()
  const { confirm, confirmDialog } = useConfirmDialog()

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

  const { mutate: createHousehold } = useCreateHousehold({
    onSuccess: () => {
      closeDrawer()
      toast.success(t('households.createSuccess'))
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    }
  })

  const { mutate: updateHousehold } = useUpdateHousehold({
    onSuccess: () => {
      closeDrawer()
      toast.success(t('households.updateSuccess'))
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    }
  })

  const { mutate: deleteHousehold } = useDeleteHousehold({
    onSuccess: () => {
      closeDrawer()
      toast.success(t('households.deleteSuccess'))
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    }
  })

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
    openDrawer(
      <div className="flex flex-col gap-4 p-4">
        <h2 className="text-2xl font-bold">{t('forms.createHousehold')}</h2>
        <p className="text-muted-foreground">
          {t('forms.createHouseholdDesc')}
        </p>
        <HouseholdForm
          onSubmit={(data) => {
            createHousehold({
              name: data.name,
              userId
            })
          }}
          onCancel={closeDrawer}
          submitLabel={t('forms.createHouseholdButton')}
        />
      </div>,
      t('forms.createHouseholdButton')
    )
  }

  const handleEditHousehold = () => {
    const currentHousehold = households?.find(
      (h) => h.id === selectedHouseholdId
    )
    if (!currentHousehold) return

    openDrawer(
      <div className="flex flex-col gap-4 p-4">
        <h2 className="text-2xl font-bold">{t('forms.editHousehold')}</h2>
        <HouseholdForm
          defaultValues={{
            name: currentHousehold.name
          }}
          householdId={currentHousehold.id}
          onSubmit={(data) => {
            updateHousehold({
              id: currentHousehold.id,
              name: data.name,
              userId
            })
          }}
          onCancel={closeDrawer}
          onDelete={() => {
            confirm({
              description: t('forms.deleteHouseholdConfirm'),
              confirmText: t('common.delete')
            }).then((isConfirmed) => {
              if (!isConfirmed) return
              deleteHousehold({
                id: currentHousehold.id,
                userId
              })
            })
          }}
          submitLabel={t('forms.saveChanges')}
        />
      </div>,
      t('forms.editHousehold')
    )
  }

  const handleShowInvitations = () => {
    openDrawer(
      <div className="flex flex-col gap-4 p-4">
        <h2 className="text-2xl font-bold">
          {t('forms.pendingInvitationsTitle')}
        </h2>
        <PendingInvitations
          onJoin={(householdId) => {
            setSelectedHousehold(householdId)
            closeDrawer()
          }}
        />
      </div>,
      t('forms.invitations')
    )
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
            {confirmDialog}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </HouseholdProvider>
  )
}
