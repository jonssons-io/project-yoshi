import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  PencilIcon,
  TrashIcon
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'

export type AccountRowAccount = {
  id: string
  name: string
  externalIdentifier?: string | null
  initialBalance: number
  currentBalance: number
  archived: boolean
  _count?: {
    transactions?: number
    budgets?: number
  }
}

interface AccountRowProps {
  account: AccountRowAccount
  onEdit: (account: AccountRowAccount) => void
  onArchive: (data: { id: string; archived: boolean }) => void
  onDelete: (data: { id: string; name: string; canDelete: boolean }) => void
  formatCurrency: (amount: number) => string
}

export const AccountRow = ({
  account,
  onEdit,
  onArchive,
  onDelete,
  formatCurrency
}: AccountRowProps) => {
  const { t } = useTranslation()
  const transactionCount = account._count?.transactions ?? 0
  const canDelete = transactionCount === 0

  return (
    <TableRow className={account.archived ? 'opacity-50 bg-muted/50' : ''}>
      <TableCell className="font-medium">
        {account.name}
        {account.archived && (
          <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full dark:bg-yellow-900/30 dark:text-yellow-400">
            {t('common.archived')}
          </span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {account.externalIdentifier || '—'}
      </TableCell>
      <TableCell className="text-right font-medium">
        {formatCurrency(account.currentBalance)}
      </TableCell>
      <TableCell>{transactionCount}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              onEdit({
                id: account.id,
                name: account.name,
                externalIdentifier: account.externalIdentifier,
                initialBalance: account.initialBalance,
                archived: account.archived,
                _count: account._count ?? {
                  transactions: transactionCount
                },
                currentBalance: account.currentBalance
              })
            }
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              onArchive({
                id: account.id,
                archived: !account.archived
              })
            }
            title={
              account.archived ? t('common.unarchive') : t('common.archive')
            }
          >
            {account.archived ? (
              <ArchiveRestoreIcon className="h-4 w-4" />
            ) : (
              <ArchiveIcon className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={!canDelete ? 'opacity-50' : undefined}
            onClick={() =>
              onDelete({
                id: account.id,
                name: account.name,
                canDelete
              })
            }
            title={t('common.delete')}
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
