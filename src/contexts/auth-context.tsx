import { createContext, type ReactNode, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { SetupPrompt } from '@/components/dashboard/SetupPrompt'
import { useHouseholdContext } from '@/contexts/household-context'
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
  children: ReactNode
}

/**
 * Gates child routes behind household selection.
 * Shows loading state while households are being fetched,
 * and SetupPrompt when no household is selected.
 * Provides guaranteed userId + householdId to children via AuthContext.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const { t } = useTranslation()
  const {
    userId,
    households,
    selectedHouseholdId,
    setSelectedHousehold,
    isHouseholdsLoading
  } = useHouseholdContext()

  const { data: accounts, isLoading: accountsLoading } = useAccountsList({
    householdId: selectedHouseholdId,
    userId,
    enabled: !!selectedHouseholdId,
    excludeArchived: true
  })

  let content = children
  if (isHouseholdsLoading) {
    content = (
      <div className="flex items-center justify-center">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  } else if (!households || households.length === 0) {
    content = <SetupPrompt variant="no-household" />
  } else if (!selectedHouseholdId) {
    // Keep provider mounted while selection resolves during client navigation.
    content = (
      <div className="flex items-center justify-center">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  } else if (accountsLoading) {
    content = (
      <div className="flex items-center justify-center">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  } else if (!accounts || accounts.length === 0) {
    content = <SetupPrompt variant="no-account" />
  }

  return (
    <AuthContext.Provider
      value={{
        userId,
        householdId: selectedHouseholdId ?? '',
        setSelectedHousehold
      }}
    >
      {content}
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
