import { useUser } from '@clerk/clerk-react'
import { createContext, type ReactNode, useContext } from 'react'
import { NoHousehold } from '@/components/dashboard/NoHousehold'
import { useSelectedHousehold } from '@/hooks/use-selected-household'

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
 * Provides userId and householdId to all child components.
 * Handles loading states and shows NoHousehold when no household is selected.
 */
export function AuthProvider({ children }: AuthProviderProps) {
	const { user, isLoaded } = useUser()
	const userId = user?.id

	const {
		selectedHouseholdId,
		setSelectedHousehold,
		isLoading: isHouseholdLoading
	} = useSelectedHousehold(userId)

	// Show loading while Clerk or household selection is loading
	if (!isLoaded || isHouseholdLoading) {
		return (
			<div className="flex items-center justify-center">
				<p className="text-muted-foreground">Loading...</p>
			</div>
		)
	}

	// User should always be present in authenticated routes due to route guard
	if (!userId) {
		return null
	}

	// Show household selection UI when no household is selected
	if (!selectedHouseholdId) {
		return <NoHousehold userId={userId} />
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
