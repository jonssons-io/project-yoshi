import { useClerk, useUser } from '@clerk/clerk-react'
import { useAuth } from '@clerk/tanstack-react-start'
import { auth } from '@clerk/tanstack-react-start/server'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useEffect } from 'react'
import { configureApiClient } from '@/api/client-config'
import { AppSidebar } from '@/components/app-sidebar'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PendingInvitations } from '@/components/dashboard/PendingInvitations'
import { DrawerProvider } from '@/components/drawer-context'
import { HeaderUserMenu } from '@/components/HeaderUserMenu'
import { Separator } from '@/components/ui/separator'
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger
} from '@/components/ui/sidebar'
import { AuthProvider } from '@/contexts/auth-context'
import { HouseholdForm } from '@/forms/HouseholdForm'
import {
	useCreateHousehold,
	useDeleteHousehold,
	useHouseholdsList,
	useUpdateHousehold
} from '@/hooks/api'
import { useDrawer } from '@/hooks/use-drawer'
import { useSelectedHousehold } from '@/hooks/use-selected-household'

const authStateFn = createServerFn().handler(async () => {
	const { userId } = await auth()

	if (!userId) {
		throw redirect({
			to: '/sign-in'
		})
	}

	return { userId }
})

export const Route = createFileRoute('/_authenticated')({
	beforeLoad: async () => await authStateFn(),
	component: AuthenticatedLayout
})

import { useTranslation } from 'react-i18next'

function AuthenticatedLayout() {
	return (
		<DrawerProvider>
			<AuthenticatedLayoutContent />
		</DrawerProvider>
	)
}

function AuthenticatedLayoutContent() {
	const { t } = useTranslation()
	const { user } = useUser()
	const { getToken } = useAuth()
	const { signOut } = useClerk()
	const userId = user?.id
	const { openDrawer, closeDrawer } = useDrawer()

	useEffect(() => {
		configureApiClient(getToken)
	}, [getToken])

	const { selectedHouseholdId, setSelectedHousehold } =
		useSelectedHousehold(userId)

	const { data: households } = useHouseholdsList({ userId })

	const { mutate: createHousehold } = useCreateHousehold({
		onSuccess: (household: { id: string }) => {
			setSelectedHousehold(household.id)
			closeDrawer()
		}
	})

	const { mutate: updateHousehold } = useUpdateHousehold({
		onSuccess: () => {
			closeDrawer()
		}
	})

	const { mutate: deleteHousehold } = useDeleteHousehold({
		onSuccess: () => {
			closeDrawer()
		}
	})

	const handleCreateHousehold = () => {
		openDrawer(
			<div className="p-4">
				<h2 className="text-2xl font-bold mb-4">
					{t('forms.createHousehold')}
				</h2>
				<p className="text-muted-foreground mb-6">
					{t('forms.createHouseholdDesc')}
				</p>
				<HouseholdForm
					onSubmit={(data) => {
						if (!userId) return
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
			<div className="p-4">
				<h2 className="text-2xl font-bold mb-4">{t('forms.editHousehold')}</h2>
				<HouseholdForm
					defaultValues={{ name: currentHousehold.name }}
					householdId={currentHousehold.id}
					onSubmit={(data) => {
						if (!userId) return
						updateHousehold({
							id: currentHousehold.id,
							name: data.name,
							userId
						})
					}}
					onCancel={closeDrawer}
					onDelete={() => {
						if (!userId) return
						if (confirm(t('forms.deleteHouseholdConfirm'))) {
							deleteHousehold({ id: currentHousehold.id, userId })
						}
					}}
					submitLabel={t('forms.saveChanges')}
				/>
			</div>,
			t('forms.editHousehold')
		)
	}

	const handleShowInvitations = () => {
		openDrawer(
			<div className="p-4">
				<h2 className="text-2xl font-bold mb-4">
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
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center justify-between border-b px-4">
					<div className="flex items-center gap-2">
						<SidebarTrigger className="-ml-1" />
						<Separator
							orientation="vertical"
							className="mr-2 data-[orientation=vertical]:h-4"
						/>
						<Breadcrumbs />
					</div>
					{user && (
						<HeaderUserMenu
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
					)}
				</header>
				<main className="p-6">
					<AuthProvider>
						<Outlet />
					</AuthProvider>
				</main>
			</SidebarInset>
		</SidebarProvider>
	)
}
