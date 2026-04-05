import { createContext, type ReactNode, useContext, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { SidebarInset } from '@/components/ui/sidebar'
import { useHouseholdContext } from '@/contexts/household-context'
import { DrawerProvider } from '@/drawers'
import { NoHouseholdOnboarding } from '@/features/no-data/no-household-onboarding'
import { useAccountsList } from '@/hooks/api'

/**
 * Context value providing guaranteed non-null userId and householdId
 * for all authenticated pages that require both values
 */
interface AuthContextValue {
  userId: string
  householdId: string
  setSelectedHousehold: (id: string | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  /** Sidebar trigger + app sidebar; must render under `DrawerProvider` (this provider supplies it). */
  sidebar: ReactNode
  children: ReactNode
}

/**
 * Gates main content behind household selection.
 * Wraps sidebar and inset in {@link DrawerProvider} so app-drawer actions work
 * from the user menu while keeping drawer bodies under {@link AuthContext.Provider}.
 */
export function AuthProvider({ sidebar, children }: AuthProviderProps) {
  const { t } = useTranslation()
  const {
    userId,
    households,
    selectedHouseholdId,
    setSelectedHousehold,
    isHouseholdsLoading
  } = useHouseholdContext()

  const { isLoading: accountsLoading } = useAccountsList({
    householdId: selectedHouseholdId,
    userId,
    enabled: !!selectedHouseholdId,
    excludeArchived: true
  })

  let content = children
  if (isHouseholdsLoading) {
    content = (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto px-4 pt-6 pb-6">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  } else if (!households || households.length === 0) {
    content = (
      <div className="flex flex-col items-center justify-center w-full h-full">
        <NoHouseholdOnboarding illustrationSize="lg" />
      </div>
    )
  } else if (!selectedHouseholdId) {
    // Keep provider mounted while selection resolves during client navigation.
    content = (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto px-4 pt-6 pb-6">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  } else if (accountsLoading) {
    content = (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto px-4 pt-6 pb-6">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  }

  const value = useMemo(
    () => ({
      userId,
      householdId: selectedHouseholdId ?? '',
      setSelectedHousehold
    }),
    [
      userId,
      selectedHouseholdId,
      setSelectedHousehold
    ]
  )

  return (
    <AuthContext.Provider value={value}>
      <DrawerProvider>
        <div className="flex h-full min-h-0 w-full flex-1 overflow-hidden">
          {sidebar}
          <SidebarInset>{content}</SidebarInset>
        </div>
      </DrawerProvider>
    </AuthContext.Provider>
  )
}

/**
 * Hook to access userId and householdId with guaranteed non-null values.
 * Must be used within an AuthProvider.
 *
 * @throws Error if used outside of AuthProvider
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
