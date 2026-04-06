import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { deleteIncomeScheduledRevision } from '@/api/generated'
import {
  listIncomeRevisionsOptions,
  listIncomeRevisionsQueryKey
} from '@/api/generated/@tanstack/react-query.gen'
import type { IncomeRevision } from '@/api/generated/types.gen'
import { useAuth } from '@/contexts/auth-context'
import { BlueprintRevisionTimeline } from '@/features/blueprint-revisions/blueprint-revision-timeline'
import type { RevisionLabelLookups } from '@/features/blueprint-revisions/format-revision-value'
import type { BlueprintRevisionLike } from '@/features/blueprint-revisions/revision-helpers'
import {
  useAccountsList,
  useCategoriesList,
  useIncomeSourcesList
} from '@/hooks/api'
import { invalidateByOperation } from '@/hooks/api/invalidate-by-operation'
import { getErrorMessage } from '@/lib/api-error'

export type IncomeRevisionsDrawerProps = {
  incomeId: string
  name: string
}

export function IncomeRevisionsDrawer(
  props: IncomeRevisionsDrawerProps & {
    onClose: () => void
  }
) {
  const { incomeId } = props
  const { t } = useTranslation()
  const { userId, householdId } = useAuth()
  const queryClient = useQueryClient()
  const [undoingRevisionId, setUndoingRevisionId] = useState<string | null>(
    null
  )

  const revisionsQuery = useQuery({
    ...listIncomeRevisionsOptions({
      path: {
        incomeId
      }
    }),
    enabled: Boolean(incomeId)
  })

  const { data: accounts = [] } = useAccountsList({
    householdId,
    userId,
    enabled: Boolean(householdId),
    excludeArchived: true
  })

  const { data: categories = [] } = useCategoriesList({
    householdId,
    userId,
    enabled: Boolean(householdId)
  })

  const { data: incomeSources = [] } = useIncomeSourcesList({
    householdId,
    userId,
    enabled: Boolean(householdId),
    includeArchived: true
  })

  const lookups = useMemo((): RevisionLabelLookups => {
    return {
      accountById: new Map(
        accounts.map((a) => [
          a.id,
          a.name
        ])
      ),
      categoryById: new Map(
        categories.map((c) => [
          c.id,
          c.name
        ])
      ),
      incomeSourceById: new Map(
        incomeSources.map((s) => [
          s.id,
          s.name
        ])
      )
    }
  }, [
    accounts,
    categories,
    incomeSources
  ])

  const revisions: IncomeRevision[] = revisionsQuery.data?.data ?? []

  const undoMutation = useMutation({
    mutationFn: async ({ revisionId }: { revisionId: string }) => {
      await deleteIncomeScheduledRevision({
        path: {
          incomeId,
          revisionId
        },
        throwOnError: true
      })
    },
    onMutate: ({ revisionId }) => {
      setUndoingRevisionId(revisionId)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: listIncomeRevisionsQueryKey({
          path: {
            incomeId
          }
        })
      })
      await invalidateByOperation(queryClient, 'listIncomes')
      toast.success(t('drawers.blueprintRevisions.undoSuccess'))
    },
    onError: (err) => {
      toast.error(
        t('drawers.blueprintRevisions.undoError', {
          message: getErrorMessage(err)
        })
      )
    },
    onSettled: () => {
      setUndoingRevisionId(null)
    }
  })

  const handleUndo = useCallback(
    (revision: BlueprintRevisionLike) => {
      undoMutation.mutate({
        revisionId: revision.id
      })
    },
    [
      undoMutation
    ]
  )

  if (revisionsQuery.isPending) {
    return (
      <p className="type-body text-muted-foreground">
        {t('drawers.blueprintRevisions.loading')}
      </p>
    )
  }

  if (revisionsQuery.isError) {
    return (
      <p className="type-body text-destructive">
        {t('drawers.blueprintRevisions.error')}
      </p>
    )
  }

  if (revisions.length === 0) {
    return (
      <p className="type-body text-muted-foreground">
        {t('drawers.blueprintRevisions.empty')}
      </p>
    )
  }

  return (
    <BlueprintRevisionTimeline
      kind="income"
      t={t}
      revisions={revisions as BlueprintRevisionLike[]}
      lookups={lookups}
      onUndo={handleUndo}
      undoingRevisionId={undoingRevisionId}
    />
  )
}
