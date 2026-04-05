import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useArchiveCategory } from '@/hooks/api/mutations/use-categories-mutations'
import { getErrorMessage } from '@/lib/api-error'

type UseCategoryTableMutationsParams = {
  onSuccess?: () => void
}

/**
 * Toast + refetch wiring for category archive / unarchive from list rows.
 */
export function useCategoryTableMutations({
  onSuccess
}: UseCategoryTableMutationsParams) {
  const { t } = useTranslation()

  const { mutate: archiveCategory } = useArchiveCategory({
    onSuccess: (_data, variables) => {
      onSuccess?.()
      toast.success(
        variables.archived
          ? t('categories.archiveSuccess')
          : t('categories.unarchiveSuccess')
      )
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    }
  })

  return {
    archiveCategory
  }
}
