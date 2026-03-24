import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  useAccountsList,
  useDeleteAccount,
  useToggleAccountArchive
} from '@/hooks/api'
import { useConfirmDialog } from '@/hooks/use-confirm-dialog'
import { getErrorMessage } from '@/lib/api-error'
import { formatCurrency } from '@/lib/utils'
import type { AccountRowAccount } from './AccountsTableRow'
import { AccountRow } from './AccountsTableRow'

export const AccountsTable = ({
  userId,
  selectedHouseholdId
}: {
  userId: string
  selectedHouseholdId: string
}) => {
  const { t } = useTranslation()
  const { data: accounts, refetch } = useAccountsList({
    householdId: selectedHouseholdId,
    userId,
    excludeArchived: false // Show all accounts in management table
  })
  const { confirm, confirmDialog } = useConfirmDialog()

  const { mutateAsync: deleteAccount } = useDeleteAccount({
    onSuccess: () => {
      refetch()
      toast.success(t('accounts.deleteSuccess'))
    }
  })

  const { mutate: toggleArchive } = useToggleAccountArchive({
    onSuccess: (_data, variables) => {
      refetch()
      toast.success(
        variables.archived
          ? t('accounts.archiveSuccess')
          : t('accounts.unarchiveSuccess')
      )
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    }
  })

  const handleDelete = async (data: {
    id: string
    name: string
    canDelete: boolean
  }) => {
    if (!data.canDelete) {
      toast.error(t('accounts.cannotDeleteNotEmpty'))
      return
    }

    const isConfirmed = await confirm({
      description: t('accounts.deleteConfirm', {
        name: data.name
      }),
      confirmText: t('common.delete')
    })
    if (!isConfirmed) return

    try {
      await deleteAccount({
        id: data.id,
        userId
      })
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      if (errorMessage.includes('Archive instead')) {
        const archiveConfirmed = await confirm({
          description: t('accounts.archiveInsteadConfirm'),
          confirmText: t('common.archive')
        })
        if (archiveConfirmed) {
          toggleArchive({
            id: data.id,
            userId,
            archived: true
          })
        }
      } else {
        toast.error(getErrorMessage(error))
      }
    }
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('common.name')}</TableHead>
            <TableHead>{t('accounts.externalId')}</TableHead>
            <TableHead className="text-right">
              {t('accounts.currentBalance')}
            </TableHead>
            <TableHead>{t('accounts.transactions')}</TableHead>
            <TableHead className="text-right">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts?.map((account) => (
            <AccountRow
              key={account.id}
              account={account as AccountRowAccount}
              onEdit={() => void 0}
              onArchive={(data) =>
                toggleArchive({
                  id: data.id,
                  userId,
                  archived: data.archived
                })
              }
              onDelete={handleDelete}
              formatCurrency={formatCurrency}
            />
          ))}
        </TableBody>
      </Table>
      {confirmDialog}
    </>
  )
}
