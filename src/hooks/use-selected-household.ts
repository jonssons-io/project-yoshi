import { useQuery } from '@tanstack/react-query'
import { listHouseholdsOptions } from '@/api/generated/@tanstack/react-query.gen'
import { fromApiDate } from '@/hooks/api/date-normalization'
import { useSetDefaultHousehold } from '@/hooks/api'

/**
 * Custom hook to manage household selection through API-backed user settings.
 */
export function useSelectedHousehold(userId?: string, enabled = true) {
  const {
    data,
    isLoading: isHouseholdsLoading,
    isFetching: isHouseholdsFetching
  } = useQuery({
    ...listHouseholdsOptions(),
    enabled: enabled && !!userId,
    retry: false,
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    select: (response) => ({
      households:
        response.data?.map((household) => ({
          ...household,
          createdAt: fromApiDate(household.createdAt)
        })) ?? [],
      defaultHouseholdId: response.defaultHouseholdId ?? null
    })
  })

  const households = data?.households
  const apiDefaultHouseholdId = data?.defaultHouseholdId ?? null

  const fallbackHouseholdId =
    !apiDefaultHouseholdId && households && households.length > 0
      ? (households[0]?.id ?? null)
      : null

  const selectedHouseholdId = apiDefaultHouseholdId ?? fallbackHouseholdId

  const { mutate: setDefaultHousehold } = useSetDefaultHousehold()

  const setSelectedHousehold = (id: string | null) => {
    if (!id || !userId) return
    setDefaultHousehold({
      householdId: id,
      userId
    })
  }

  const isLoading = isHouseholdsLoading || isHouseholdsFetching

  return {
    households,
    selectedHouseholdId,
    setSelectedHousehold,
    isLoading
  }
}
