import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { deleteBillScheduledRevision } from '@/api/generated'
import {
  listBillRevisionsOptions,
  listBillRevisionsQueryKey
} from '@/api/generated/@tanstack/react-query.gen'
import type { BillRevision } from '@/api/generated/types.gen'
import { useAuth } from '@/contexts/auth-context'
import { BlueprintRevisionTimeline } from '@/features/blueprint-revisions/blueprint-revision-timeline'
import type { RevisionLabelLookups } from '@/features/blueprint-revisions/format-revision-value'
import type { BlueprintRevisionLike } from '@/features/blueprint-revisions/revision-helpers'
import {
  useAccountsList,
  useBudgetsList,
  useCategoriesList,
  useRecipientsList
} from '@/hooks/api'
import { invalidateByOperation } from '@/hooks/api/invalidate-by-operation'
import { getErrorMessage } from '@/lib/api-error'

export type BillRevisionsDrawerProps = {
  billId: string
  name: string
}

export function BillRevisionsDrawer(
  props: BillRevisionsDrawerProps & {
    onClose: () => void
  }
) {
  const { billId } = props
  const { t } = useTranslation()
  const { userId, householdId } = useAuth()
  const queryClient = useQueryClient()
  const [undoingRevisionId, setUndoingRevisionId] = useState<string | null>(
    null
  )

  const revisionsQuery = useQuery({
    ...listBillRevisionsOptions({
      path: {
        billId
      }
    }),
    enabled: Boolean(billId)
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

  const { data: budgets = [] } = useBudgetsList({
    householdId,
    userId,
    enabled: Boolean(householdId)
  })

  const { data: recipients = [] } = useRecipientsList({
    householdId,
    userId,
    enabled: Boolean(householdId)
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
      budgetById: new Map(
        budgets.map((b) => [
          b.id,
          b.name
        ])
      ),
      recipientById: new Map(
        recipients.map((r) => [
          r.id,
          r.name ?? r.id
        ])
      )
    }
  }, [
    accounts,
    categories,
    budgets,
    recipients
  ])

  const revisions: BillRevision[] = revisionsQuery.data?.data ?? []

  const undoMutation = useMutation({
    mutationFn: async ({ revisionId }: { revisionId: string }) => {
      await deleteBillScheduledRevision({
        path: {
          billId,
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
        queryKey: listBillRevisionsQueryKey({
          path: {
            billId
          }
        })
      })
      await invalidateByOperation(queryClient, 'listBills')
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
      kind="bill"
      t={t}
      revisions={revisions as BlueprintRevisionLike[]}
      lookups={lookups}
      onUndo={handleUndo}
      undoingRevisionId={undoingRevisionId}
    />
  )
}
