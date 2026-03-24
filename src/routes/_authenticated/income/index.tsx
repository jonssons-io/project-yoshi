/**
 * Income Page - List and manage recurring income
 */

import { createFileRoute } from '@tanstack/react-router'
import { format } from 'date-fns'
import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  ChevronDown,
  ChevronRight,
  MoreVerticalIcon,
  Pencil,
  Plus,
  ReceiptText,
  Trash2
} from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  type Income,
  type IncomeInstance,
  type IncomeSource,
  InstanceStatus,
  RecurrenceType
} from '@/api/generated/types.gen'
import { BaseButton } from '@/components/base-button/base-button'
import { Button } from '@/components/button/button'
import { IconButton } from '@/components/icon-button/icon-button'
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
import { SetupPrompt } from '@/features/setup-prompt/setup-prompt'
import {
  useAccountsList,
  useArchiveIncome,
  useCategoriesList,
  useDeleteIncome,
  useIncomeList
} from '@/hooks/api'
import { useIncomeInstancesList } from '@/hooks/api/queries/use-income-query'
import { useConfirmDialog } from '@/hooks/use-confirm-dialog'
import { getErrorMessage } from '@/lib/api-error'
import { formatCurrency } from '@/lib/utils'

type NormalizedIncome = Omit<Income, 'expectedDate' | 'endDate'> & {
  expectedDate: Date
  endDate?: Date | undefined
}

type NormalizedIncomeInstance = Omit<IncomeInstance, 'expectedDate'> & {
  expectedDate: Date
}

type SelectableCategory = {
  id: string
  name: string
  types: string[]
  archived?: boolean
}

type SelectableAccount = {
  id: string
  name: string
  archived?: boolean
}

type IncomeInstancesSectionProps = {
  income: NormalizedIncome
  expanded: boolean
  userId?: string | null
  accountsById: Map<string, SelectableAccount>
  categoriesById: Map<string, SelectableCategory>
  onEditInstance: (instanceId: string) => void
  onRecordInstance: (
    income: NormalizedIncome,
    instance: NormalizedIncomeInstance
  ) => void
}

export const Route = createFileRoute('/_authenticated/income/')({
  component: IncomePage
})

function getIncomeInstanceStatusClass(status: InstanceStatus): string {
  switch (status) {
    case InstanceStatus.HANDLED:
      return 'border-green-200 bg-green-50 text-green-700'
    case InstanceStatus.DUE:
      return 'border-amber-200 bg-amber-50 text-amber-700'
    default:
      return 'border-muted-foreground/20 bg-muted text-muted-foreground'
  }
}

function IncomeInstancesSection({
  income,
  expanded,
  userId,
  accountsById,
  categoriesById,
  onEditInstance,
  onRecordInstance
}: IncomeInstancesSectionProps) {
  const { t } = useTranslation()
  const instancesQuery = useIncomeInstancesList({
    incomeId: income.id,
    userId,
    enabled: expanded
  })

  if (!expanded) return null

  if (instancesQuery.isLoading) {
    return (
      <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
        {t('income.instancesLoading')}
      </div>
    )
  }

  const instances = [
    ...(instancesQuery.data ?? [])
  ].sort(
    (a: NormalizedIncomeInstance, b: NormalizedIncomeInstance) =>
      a.expectedDate.getTime() - b.expectedDate.getTime()
  )

  if (instances.length === 0) {
    return (
      <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
        {t('income.noInstances')}
      </div>
    )
  }

  return (
    <div className="rounded-md border bg-muted/20">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('income.instanceName')}</TableHead>
            <TableHead>{t('income.instanceExpectedDate')}</TableHead>
            <TableHead>{t('common.amount')}</TableHead>
            <TableHead>{t('common.account')}</TableHead>
            <TableHead>{t('common.category')}</TableHead>
            <TableHead>{t('income.instanceStatusLabel')}</TableHead>
            <TableHead className="text-right">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {instances.map((instance) => (
            <TableRow key={instance.id}>
              <TableCell className="font-medium">{instance.name}</TableCell>
              <TableCell>
                {format(instance.expectedDate, 'MMM d, yyyy')}
              </TableCell>
              <TableCell>{formatCurrency(instance.amount)}</TableCell>
              <TableCell>
                {accountsById.get(instance.accountId)?.name ?? '-'}
              </TableCell>
              <TableCell>
                {instance.categoryId
                  ? (categoriesById.get(instance.categoryId)?.name ?? '-')
                  : '-'}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={getIncomeInstanceStatusClass(instance.status)}
                >
                  {t(`income.instanceStatus.${instance.status.toLowerCase()}`)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outlined"
                    color="subtle"
                    onClick={() => onEditInstance(instance.id)}
                    icon={<Pencil />}
                    label={t('income.editInstance')}
                  />
                  <Button
                    variant="filled"
                    color="primary"
                    onClick={() => onRecordInstance(income, instance)}
                    disabled={instance.status === InstanceStatus.HANDLED}
                    icon={<ReceiptText />}
                    label={
                      instance.status === InstanceStatus.HANDLED
                        ? t('income.handled')
                        : t('income.recordIncome')
                    }
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function IncomePage() {
  const { t } = useTranslation()
  const { userId, householdId } = useAuth()
  const { confirm, confirmDialog } = useConfirmDialog()
  const [expandedIncomeIds, setExpandedIncomeIds] = useState<
    Record<string, boolean>
  >({})

  const incomeQuery = useIncomeList({
    householdId,
    userId,
    includeArchived: true
  })

  const accountsQuery = useAccountsList({
    householdId,
    userId,
    excludeArchived: true
  })

  const categoriesQuery = useCategoriesList({
    householdId,
    userId,
    type: 'INCOME'
  })
  const deleteMutation = useDeleteIncome({
    onSuccess: () => {
      incomeQuery.refetch()
      toast.success(t('income.deleteSuccess'))
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    }
  })

  const archiveMutation = useArchiveIncome({
    onSuccess: (_data, variables) => {
      incomeQuery.refetch()
      toast.success(
        variables.archived
          ? t('income.archiveSuccess')
          : t('income.unarchiveSuccess')
      )
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    }
  })

  const incomeSourcesById = useMemo(
    () =>
      (incomeQuery.data ?? []).reduce<Record<string, IncomeSource>>(
        (accumulator, income) => {
          if (income.incomeSource) {
            accumulator[income.incomeSource.id] = income.incomeSource
          }
          return accumulator
        },
        {}
      ),
    [
      incomeQuery.data
    ]
  )

  const accountsById = useMemo(
    () =>
      new Map(
        (accountsQuery.data ?? []).map((account) => [
          account.id,
          {
            id: account.id,
            name: account.name,
            archived: account.archived
          }
        ])
      ),
    [
      accountsQuery.data
    ]
  )
  const categoriesById = useMemo(
    () =>
      new Map(
        (categoriesQuery.data ?? []).map((category) => [
          category.id,
          {
            id: category.id,
            name: category.name,
            types: category.types,
            archived: category.archived
          }
        ])
      ),
    [
      categoriesQuery.data
    ]
  )

  const getIncomeSourceName = (income: NormalizedIncome): string => {
    if (income.incomeSource?.name) return income.incomeSource.name
    return incomeSourcesById[income.incomeSourceId]?.name ?? ''
  }

  const getRecurrenceLabel = (
    type: RecurrenceType,
    customDays?: number | null
  ) => {
    switch (type) {
      case RecurrenceType.NONE:
        return t('income.oneTime')
      case RecurrenceType.WEEKLY:
        return t('income.weekly')
      case RecurrenceType.MONTHLY:
        return t('income.monthly')
      case RecurrenceType.QUARTERLY:
        return t('income.quarterly')
      case RecurrenceType.YEARLY:
        return t('income.yearly')
      case RecurrenceType.CUSTOM:
        return t('income.custom', {
          days: customDays
        })
      default:
        return type
    }
  }

  const toggleExpanded = (incomeId: string) => {
    setExpandedIncomeIds((current) => ({
      ...current,
      [incomeId]: !current[incomeId]
    }))
  }

  const handleCreate = () => {
    void 0
  }

  const handleEdit = (_income: NormalizedIncome) => {
    void 0
  }

  const handleEditInstance = (_instanceId: string) => {
    void 0
  }

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      description: t('income.deleteConfirm'),
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

  const handleRecordIncome = (
    _income: NormalizedIncome,
    _instance: NormalizedIncomeInstance
  ) => {
    void 0
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 space-y-6 overflow-auto px-4 pt-6 pb-6">
        <div className="flex items-center justify-end gap-2">
          <Button
            onClick={handleCreate}
            icon={<Plus />}
            label={t('income.add')}
          />
        </div>

        {incomeQuery.isLoading ? (
          <div className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">{t('income.loading')}</p>
          </div>
        ) : !(incomeQuery.data && incomeQuery.data.length > 0) ? (
          <SetupPrompt
            variant="no-income"
            onAction={handleCreate}
          />
        ) : (
          <Card>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>{t('common.name')}</TableHead>
                    <TableHead>{t('income.source')}</TableHead>
                    <TableHead>{t('common.account')}</TableHead>
                    <TableHead>{t('common.amount')}</TableHead>
                    <TableHead>{t('recurrence.label')}</TableHead>
                    <TableHead>{t('income.nextExpected')}</TableHead>
                    <TableHead>{t('common.category')}</TableHead>
                    <TableHead className="text-right">
                      {t('common.actions')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomeQuery.data?.map((income) => {
                    const isExpanded = !!expandedIncomeIds[income.id]

                    return (
                      <Fragment key={income.id}>
                        <TableRow
                          className={income.archived ? 'opacity-50' : ''}
                        >
                          <TableCell>
                            <IconButton
                              variant="text"
                              color="subtle"
                              icon={
                                isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )
                              }
                              onClick={() => toggleExpanded(income.id)}
                              aria-label={t('income.toggleInstances')}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {income.archived ? (
                              <Badge
                                variant="secondary"
                                className="mr-2"
                              >
                                {t('income.archived')}
                              </Badge>
                            ) : null}
                            {income.name}
                          </TableCell>
                          <TableCell>{getIncomeSourceName(income)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {income.account?.name ?? '-'}
                              {income.account?.archived ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>
                                        {t('income.archivedAccountWarning')}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatCurrency(income.estimatedAmount)}
                          </TableCell>
                          <TableCell>
                            {getRecurrenceLabel(
                              income.recurrenceType,
                              income.customIntervalDays
                            )}
                          </TableCell>
                          <TableCell>
                            {format(income.expectedDate, 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>{income.category?.name ?? '-'}</TableCell>
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
                                <DropdownMenuItem
                                  onClick={() => toggleExpanded(income.id)}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="mr-2 h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="mr-2 h-4 w-4" />
                                  )}
                                  {t('income.viewInstances')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleEdit(income)}
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  {t('common.edit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    income.archived
                                      ? handleArchive(income.id, false)
                                      : handleArchive(income.id, true)
                                  }
                                >
                                  {income.archived ? (
                                    <>
                                      <ArchiveRestore className="mr-2 h-4 w-4" />
                                      {t('common.unarchive')}
                                    </>
                                  ) : (
                                    <>
                                      <Archive className="mr-2 h-4 w-4" />
                                      {t('common.archive')}
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(income.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {t('common.delete')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                        {isExpanded ? (
                          <TableRow>
                            <TableCell
                              colSpan={9}
                              className="bg-muted/10"
                            >
                              <div className="space-y-3 py-2">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">
                                      {t('income.instancesSectionTitle')}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {t('income.instancesSectionDescription')}
                                    </p>
                                  </div>
                                </div>
                                <IncomeInstancesSection
                                  income={income}
                                  expanded={isExpanded}
                                  userId={userId}
                                  accountsById={accountsById}
                                  categoriesById={categoriesById}
                                  onEditInstance={handleEditInstance}
                                  onRecordInstance={handleRecordIncome}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
      {confirmDialog}
    </div>
  )
}
