/**
 * Bills Page - List and manage bills
 */

import { createFileRoute } from '@tanstack/react-router'
import { endOfMonth, format, startOfMonth } from 'date-fns'
import {
  ArchiveIcon,
  Edit2Icon,
  MoreVerticalIcon,
  PlusIcon,
  ReceiptIcon,
  TrashIcon
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  type BillInstance,
  InstanceStatus,
  RecurrenceType
} from '@/api/generated/types.gen'
import { BaseButton } from '@/components/base-button/base-button'
import { Button } from '@/components/button/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { useAuth } from '@/contexts/auth-context'
import { NoData } from '@/features/no-data/no-data'
import {
  useArchiveBill,
  useBudgetsList,
  useDeleteBill,
  useTransactionsList
} from '@/hooks/api'
import { useBillInstancesList } from '@/hooks/api/queries/use-bills-query'
import { useConfirmDialog } from '@/hooks/use-confirm-dialog'
import { getErrorMessage } from '@/lib/api-error'
import { formatCurrency } from '@/lib/utils'

// Search params schema
const billsSearchSchema = z.object({
  budgetId: z.string().optional()
})

export const Route = createFileRoute('/_authenticated/bills/')({
  component: BillsPage,
  validateSearch: (search) => billsSearchSchema.parse(search)
})

type NormalizedBillInstance = Omit<BillInstance, 'dueDate' | 'startDate'> & {
  dueDate: Date
  startDate: Date
}

function getBillStatusBadgeClass(status: InstanceStatus): string {
  switch (status) {
    case InstanceStatus.HANDLED:
      return 'border-green-200 bg-green-50 text-green-700'
    case InstanceStatus.DUE:
      return 'border-amber-200 bg-amber-50 text-amber-700'
    default:
      return 'border-muted-foreground/20 bg-muted text-muted-foreground'
  }
}

function BillsPage() {
  const { t } = useTranslation()
  const { budgetId: urlBudgetId } = Route.useSearch()
  const { userId, householdId } = useAuth()
  const { confirm, confirmDialog } = useConfirmDialog()

  const [thisMonthOnly, setThisMonthOnly] = useState(false)
  const [includeArchived, setIncludeArchived] = useState(false)
  const [budgetFilter, setBudgetFilter] = useState(urlBudgetId ?? '__all__')
  const { data: budgets } = useBudgetsList({
    householdId,
    userId
  })
  const selectedBudgetId = budgetFilter === '__all__' ? undefined : budgetFilter

  const billsQuery = useBillInstancesList({
    householdId,
    budgetId: selectedBudgetId,
    includeArchived,
    dateFrom: thisMonthOnly ? startOfMonth(new Date()) : undefined,
    dateTo: thisMonthOnly ? endOfMonth(new Date()) : undefined,
    enabled: !!householdId
  })

  const transactionsQuery = useTransactionsList({
    householdId,
    userId,
    enabled: !!householdId
  })
  const transactionsById = useMemo(
    () =>
      new Map(
        (transactionsQuery.data ?? []).map((transaction) => [
          transaction.id,
          transaction
        ])
      ),
    [
      transactionsQuery.data
    ]
  )

  // Delete mutation
  const deleteMutation = useDeleteBill({
    onSuccess: () => {
      billsQuery.refetch()
      toast.success(t('bills.deleteSuccess'))
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    }
  })

  // Archive mutation
  const archiveMutation = useArchiveBill({
    onSuccess: (_data, variables) => {
      billsQuery.refetch()
      toast.success(
        variables.archived
          ? t('bills.archiveSuccess')
          : t('bills.unarchiveSuccess')
      )
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    }
  })

  const getBillRecipientName = (bill: {
    recipient: {
      name: string | null
    }
  }): string => bill.recipient.name ?? ''

  const handleCreate = () => {
    void 0
  }

  if (billsQuery.isLoading) {
    return (
      <div className="px-4 pt-6 pb-6 text-center text-muted-foreground">
        <div className="py-8">{t('common.loading')}</div>
      </div>
    )
  }
  if (billsQuery.data?.length === 0) {
    return (
      <div className="px-4 pt-6 pb-6">
        <NoData
          variant="no-bills"
          onAction={handleCreate}
        />
      </div>
    )
  }

  const handleEditBillInstance = (_bill: NormalizedBillInstance) => {
    void 0
  }

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      description: t('bills.deleteConfirm'),
      confirmText: t('common.delete')
    })
    if (!isConfirmed) return
    deleteMutation.mutate({
      id,
      userId
    })
  }

  const handleArchive = (id: string, archived: boolean) => {
    archiveMutation.mutate({
      id,
      archived,
      userId
    })
  }

  const handleLinkTransaction = (_bill: NormalizedBillInstance) => {
    void 0
  }

  const getRecurrenceLabel = (type: RecurrenceType) => {
    switch (type) {
      case RecurrenceType.NONE:
        return t('recurrence.none')
      case RecurrenceType.WEEKLY:
        return t('recurrence.weekly')
      case RecurrenceType.MONTHLY:
        return t('recurrence.monthly')
      case RecurrenceType.QUARTERLY:
        return t('recurrence.quarterly')
      case RecurrenceType.YEARLY:
        return t('recurrence.yearly')
      case RecurrenceType.CUSTOM:
        return t('recurrence.custom')
      default:
        return type
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 space-y-6 overflow-auto px-4 pt-6 pb-6">
        {/* Toolbar */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end">
          <Select
            value={budgetFilter}
            onValueChange={setBudgetFilter}
          >
            <SelectTrigger className="w-full md:w-56">
              <SelectValue placeholder={t('forms.selectBudget')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t('transactions.all')}</SelectItem>
              {(budgets ?? []).map((budget) => (
                <SelectItem
                  key={budget.id}
                  value={budget.id}
                >
                  {budget.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={thisMonthOnly ? 'filled' : 'outlined'}
            color={thisMonthOnly ? 'primary' : 'subtle'}
            onClick={() => setThisMonthOnly(!thisMonthOnly)}
            label={t('bills.thisMonth')}
          />
          <Button
            variant={includeArchived ? 'filled' : 'outlined'}
            color={includeArchived ? 'primary' : 'subtle'}
            onClick={() => setIncludeArchived(!includeArchived)}
            label={
              includeArchived
                ? t('bills.hideArchived')
                : t('bills.showArchived')
            }
          />
          <Button
            onClick={handleCreate}
            icon={<PlusIcon className="h-4 w-4" />}
            label={t('bills.newBill')}
          />
        </div>
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.name')}</TableHead>
                  <TableHead>{t('common.recipient')}</TableHead>
                  <TableHead>{t('common.account')}</TableHead>
                  <TableHead>{t('common.amount')}</TableHead>
                  <TableHead>{t('recurrence.label')}</TableHead>
                  <TableHead>{t('forms.nextExpectedDate')}</TableHead>
                  <TableHead>{t('bills.status')}</TableHead>
                  <TableHead>{t('common.category')}</TableHead>
                  <TableHead>{t('bills.linkedTransaction')}</TableHead>
                  <TableHead className="text-right">
                    {t('common.actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billsQuery.data?.map((bill) => {
                  const hasSplits = bill.splits && bill.splits.length > 0
                  const linkedTransaction = bill.transaction?.id
                    ? transactionsById.get(bill.transaction.id)
                    : undefined

                  return (
                    <TableRow
                      key={bill.id}
                      className={bill.archived ? 'opacity-50' : ''}
                    >
                      <TableCell className="font-medium">
                        {bill.name}
                        {bill.archived && (
                          <Badge
                            variant="secondary"
                            className="ml-2"
                          >
                            {t('common.archived')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{getBillRecipientName(bill)}</TableCell>
                      <TableCell>{bill.account?.name ?? '-'}</TableCell>
                      <TableCell>{formatCurrency(bill.amount)}</TableCell>
                      <TableCell>
                        {getRecurrenceLabel(bill.recurrenceType)}
                      </TableCell>
                      <TableCell>
                        {format(bill.dueDate, 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getBillStatusBadgeClass(bill.status)}
                        >
                          {t(
                            `bills.instanceStatus.${bill.status.toLowerCase()}`
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {hasSplits ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="outline"
                                  className="cursor-help"
                                >
                                  {(bill.splits ?? []).length}{' '}
                                  {t('bills.sections')}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent className="w-64 p-0">
                                <div className="p-2 space-y-2">
                                  <p className="font-semibold text-xs border-b pb-1">
                                    {t('bills.sections')}
                                  </p>
                                  {(bill.splits ?? []).map((s, i: number) => (
                                    <div
                                      key={`${i}-${s.amount}`}
                                      className="flex justify-between text-xs"
                                    >
                                      <span>
                                        {s.subtitle || s.category?.name}
                                      </span>
                                      <span>{formatCurrency(s.amount)}</span>
                                    </div>
                                  ))}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          (bill.category?.name ?? '-')
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {bill.status === InstanceStatus.HANDLED &&
                        bill.transaction?.id ? (
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">
                              {linkedTransaction?.name ??
                                t('bills.linkedTransactionFallback')}
                            </p>
                            <p>
                              {linkedTransaction
                                ? `${format(linkedTransaction.date, 'MMM d, yyyy')} · ${formatCurrency(linkedTransaction.amount)}`
                                : bill.transaction.id}
                            </p>
                          </div>
                        ) : (
                          <Button
                            variant="outlined"
                            color="subtle"
                            onClick={() => handleLinkTransaction(bill)}
                            icon={<ReceiptIcon className="h-4 w-4" />}
                            label={t('transactions.createTransaction')}
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <BaseButton
                              variant="text"
                              color="subtle"
                              iconOnly
                            >
                              <MoreVerticalIcon className="h-4 w-4" />
                            </BaseButton>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {bill.status !== InstanceStatus.HANDLED && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleLinkTransaction(bill)}
                                >
                                  <ReceiptIcon className="h-4 w-4 mr-2" />
                                  {t('bills.linkTransaction')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            {bill.status !== InstanceStatus.HANDLED ? (
                              <DropdownMenuItem
                                onClick={() => handleEditBillInstance(bill)}
                              >
                                <Edit2Icon className="h-4 w-4 mr-2" />
                                {t('common.edit')}
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuItem
                              onClick={() => {
                                if (!bill.bill?.id) return
                                handleArchive(bill.bill.id, !bill.archived)
                              }}
                            >
                              <ArchiveIcon className="h-4 w-4 mr-2" />
                              {bill.archived
                                ? t('common.unarchive')
                                : t('common.archive')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                if (!bill.bill?.id) return
                                handleDelete(bill.bill.id)
                              }}
                              className="text-destructive"
                            >
                              <TrashIcon className="h-4 w-4 mr-2" />
                              {t('common.delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      {confirmDialog}
    </div>
  )
}
