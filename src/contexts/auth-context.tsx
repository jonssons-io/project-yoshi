import { createContext, useContext, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { SetupPrompt } from '@/components/dashboard/SetupPrompt'
import { useHouseholdContext } from '@/contexts/household-context'

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

	if (isHouseholdsLoading) {
		return (
			<div className="flex items-center justify-center">
				<p className="text-muted-foreground">{t('common.loading')}</p>
			</div>
		)
	}

	if (!households || households.length === 0) {
		return <SetupPrompt variant="no-household" />
	}

	// Households exist but API-backed default selection has not resolved yet.
	if (!selectedHouseholdId) {
		return (
			<div className="flex items-center justify-center">
				<p className="text-muted-foreground">{t('common.loading')}</p>
			</div>
		)
	}

	return (
		<AuthContext.Provider
			value={{
				userId,
				householdId: selectedHouseholdId,
				setSelectedHousehold
			}}
		>
			{children}
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
