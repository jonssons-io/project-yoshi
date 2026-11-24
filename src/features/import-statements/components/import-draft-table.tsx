import { createColumnHelper } from '@tanstack/react-table'
import {
  EditIcon,
  Link2,
  Lock,
  LockOpen,
  SaveIcon,
  SaveOffIcon,
  Unlink
} from 'lucide-react'
import { type RefObject, useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type BillInstance,
  type IncomeInstance,
  TransactionType
} from '@/api/generated/types.gen'
import { Button } from '@/components/button/button'
import { Checkbox } from '@/components/checkbox/checkbox'
import {
  DataTable,
  type DataTableColumnDef,
  useDataTable
} from '@/components/data-table'
import { IconButton } from '@/components/icon-button/icon-button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  type BulkEditValues,
  ImportBulkEditDialog,
  NO_CHANGE_VALUE
} from '@/dialogs/import-statements/import-bulk-edit-dialog'
import { activeBillSplits, isLockedToBill } from '../bill-link'
import {
  buildBillInstancePatch,
  buildIncomeInstancePatch,
  getBillInstanceLabel,
  getIncomeInstanceLabel,
  type RankedInstance,
  rankBillInstancesForDraft,
  rankIncomeInstancesForDraft
} from '../classification/instance-matching'
import type { ImportLookupItem, TransactionDraft } from '../types'
import { formatSwedishMoney } from '../utils/money'
import {
  comboboxValueToIdAndNewName,
  DraftCombobox,
  DraftPlainText,
  DraftSelect,
  DraftTextInput,
  idOrNewNameToComboboxValue,
  lookupItemsToComboboxOptions,
  SelectOptionList
} from './import-table-fields'

type ImportDraftTableKind =
  | 'uncategorized'
  | typeof TransactionType.INCOME
  | typeof TransactionType.EXPENSE
  | typeof TransactionType.TRANSFER

type ImportDraftTableProps = {
  title: string
  kind: ImportDraftTableKind
  rows: TransactionDraft[]
  accounts: ImportLookupItem[]
  budgets: ImportLookupItem[]
  categories: ImportLookupItem[]
  recipients: ImportLookupItem[]
  incomeSources: ImportLookupItem[]
  incomeInstances: IncomeInstance[]
  billInstances: BillImportInstance[]
  /** Show which account each row belongs to (several statements at once). */
  showOriginAccount?: boolean
  onDraftChange: (id: string, patch: Partial<TransactionDraft>) => void
}

/** Instances offered when none stands out as a likely match for the row. */
const FALLBACK_INSTANCE_COUNT = 5

const columnHelper = createColumnHelper<TransactionDraft>()

const getImportDraftRowId = (row: TransactionDraft) => row.id

type ImportDraftColumnVolatileContext = {
  selectedIds: Set<string>
  onSelectedChange: (id: string, selected: boolean) => void
  onOpenInstancePicker: (draft: InstancePickerDraft) => void
  /** Unlocks a bill-linked row for editing, or locks it to the bill again. */
  onToggleBillLock: (draft: TransactionDraft) => void
  onDraftChange: (id: string, patch: Partial<TransactionDraft>) => void
  t: (key: string, options?: Record<string, unknown>) => string
}

type ImportDraftColumnStableContext = {
  kind: ImportDraftTableKind
  accounts: ImportLookupItem[]
  budgets: ImportLookupItem[]
  categories: ImportLookupItem[]
  recipients: ImportLookupItem[]
  incomeSources: ImportLookupItem[]
  showOriginAccount: boolean
}

type BillImportInstance = Omit<BillInstance, 'dueDate'> & {
  dueDate: string | Date
}

type InstancePickerDraft = TransactionDraft & {
  type: typeof TransactionType.INCOME | typeof TransactionType.EXPENSE
}

function buildBulkPatch(
  draft: TransactionDraft,
  values: BulkEditValues,
  instances: {
    incomeInstances: IncomeInstance[]
    billInstances: BillImportInstance[]
  }
): Partial<TransactionDraft> {
  const nextType = values.type === NO_CHANGE_VALUE ? draft.type : values.type
  const patch: Partial<TransactionDraft> = {}

  if (values.name && nextType !== TransactionType.TRANSFER)
    patch.name = values.name
  if (values.type !== NO_CHANGE_VALUE) patch.type = values.type
  if (nextType === TransactionType.EXPENSE && values.recipient !== null) {
    const next = comboboxValueToIdAndNewName(values.recipient)
    patch.recipientId = next.id ?? ''
    patch.newRecipientName = next.newName
    patch.billInstanceId = ''
  }
  if (nextType === TransactionType.INCOME && values.incomeSource !== null) {
    const next = comboboxValueToIdAndNewName(values.incomeSource)
    patch.incomeSourceId = next.id ?? ''
    patch.newIncomeSourceName = next.newName
    patch.incomeInstanceId = ''
  }
  if (nextType === TransactionType.INCOME && values.incomeInstanceId) {
    const instance = instances.incomeInstances.find(
      (item) => item.id === values.incomeInstanceId
    )
    Object.assign(
      patch,
      instance
        ? buildIncomeInstancePatch(instance)
        : {
            incomeInstanceId: values.incomeInstanceId
          }
    )
  }
  if (nextType === TransactionType.TRANSFER && values.transferToAccountId) {
    patch.transferToAccountId = values.transferToAccountId
  }
  if (nextType === TransactionType.TRANSFER && values.transferFromAccountId) {
    patch.transferFromAccountId = values.transferFromAccountId
  }
  if (nextType === TransactionType.EXPENSE && values.billInstanceId) {
    const instance = instances.billInstances.find(
      (item) => item.id === values.billInstanceId
    )
    Object.assign(
      patch,
      instance
        ? buildBillInstancePatch(instance)
        : {
            billInstanceId: values.billInstanceId
          }
    )
  }
  if (nextType !== TransactionType.TRANSFER) {
    if (values.budgetId) patch.budgetId = values.budgetId
    if (values.category !== null) {
      const next = comboboxValueToIdAndNewName(values.category)
      patch.categoryId = next.id
      patch.newCategoryName = next.newName
    }
  }

  // A row that stays linked to its bill keeps the bill's name, budget, and
  // category; a bulk edit only reaches them once the row is unlocked.
  if (isLockedToBill(draft) && patch.billInstanceId === undefined) {
    delete patch.name
    delete patch.budgetId
    delete patch.categoryId
    delete patch.newCategoryName
  }

  return patch
}

/** Read-only cell for a row that follows a bill split over several lines. */
function BillSplitsSummary({
  label,
  lines
}: {
  label: string
  lines: string[]
}) {
  return (
    <ul
      className="type-label flex flex-col text-gray-600"
      aria-label={label}
    >
      {lines.map((line) => (
        <li
          key={line}
          className="whitespace-nowrap"
        >
          {line}
        </li>
      ))}
    </ul>
  )
}

function canEditDate(kind: ImportDraftTableKind): boolean {
  return kind !== 'uncategorized'
}

function canEditName(kind: ImportDraftTableKind): boolean {
  return kind === TransactionType.INCOME || kind === TransactionType.EXPENSE
}

function lookupName(
  items: ImportLookupItem[],
  id: string | null | undefined
): string {
  return items.find((item) => item.id === id)?.name ?? ''
}

function getAvailableIncomeInstances({
  draft,
  rows,
  incomeInstances
}: {
  draft: TransactionDraft
  rows: TransactionDraft[]
  incomeInstances: IncomeInstance[]
}): IncomeInstance[] {
  const selectedIds = new Set(
    rows
      .filter((row) => row.id !== draft.id)
      .map((row) => row.incomeInstanceId)
      .filter((id): id is string => Boolean(id))
  )

  return incomeInstances.filter((instance) => {
    if (selectedIds.has(instance.id) || instance.transactionId) return false
    if (
      draft.incomeSourceId &&
      instance.incomeSourceId !== draft.incomeSourceId
    ) {
      return false
    }
    return true
  })
}

function getAvailableBillInstances({
  draft,
  rows,
  billInstances
}: {
  draft: TransactionDraft
  rows: TransactionDraft[]
  billInstances: BillImportInstance[]
}): BillImportInstance[] {
  const selectedIds = new Set(
    rows
      .filter((row) => row.id !== draft.id)
      .map((row) => row.billInstanceId)
      .filter((id): id is string => Boolean(id))
  )

  return billInstances.filter((instance) => {
    if (selectedIds.has(instance.id) || instance.transaction?.id) return false
    if (draft.recipientId && instance.recipient.id !== draft.recipientId) {
      return false
    }
    return true
  })
}

function createColumns(
  volatileCtxRef: RefObject<ImportDraftColumnVolatileContext>,
  {
    kind,
    accounts,
    budgets,
    categories,
    recipients,
    incomeSources,
    showOriginAccount
  }: ImportDraftColumnStableContext
): DataTableColumnDef<TransactionDraft>[] {
  const { t } = volatileCtxRef.current
  const columns: DataTableColumnDef<TransactionDraft>[] = [
    columnHelper.display({
      id: 'selected',
      header: '',
      enableSorting: false,
      cell: (ctx) => {
        const draft = ctx.row.original
        const {
          selectedIds,
          onSelectedChange,
          t: translate
        } = volatileCtxRef.current
        return (
          <Checkbox
            id={`statement-import-select-${kind}-${draft.id}`}
            checked={selectedIds.has(draft.id)}
            disabled={draft.excluded}
            aria-label={translate('statementImport.table.selectRowAria', {
              row: draft.sourceRowNumber
            })}
            onCheckedChange={(checked) => onSelectedChange(draft.id, checked)}
          />
        )
      }
    }),
    columnHelper.accessor('sourceRowNumber', {
      id: 'sourceRowNumber',
      header: t('statementImport.table.row'),
      cell: (ctx) => {
        const draft = ctx.row.original
        const { t: translate } = volatileCtxRef.current
        // Say why the import excluded a row by itself, so it is not mistaken
        // for a manual exclusion.
        const marker = draft.duplicateOfTransactionId
          ? {
              label: translate('statementImport.table.alreadyImported'),
              hint: translate('statementImport.table.alreadyImportedHint')
            }
          : draft.pairedWithDraftId
            ? {
                label: translate('statementImport.table.pairedTransfer'),
                hint: translate('statementImport.table.pairedTransferHint')
              }
            : null
        return (
          <span className="flex flex-col gap-0.5">
            <DraftPlainText>{draft.sourceRowNumber}</DraftPlainText>
            {marker ? (
              <span
                className="type-label whitespace-nowrap text-gray-600"
                title={marker.hint}
              >
                {marker.label}
              </span>
            ) : null}
          </span>
        )
      },
      meta: {
        globalSearchable: true,
        searchValue: (row: TransactionDraft) => String(row.sourceRowNumber)
      }
    }),
    columnHelper.display({
      id: 'instanceLink',
      header: '',
      enableSorting: false,
      cell: (ctx) => {
        const draft = ctx.row.original
        const {
          onDraftChange,
          onOpenInstancePicker,
          onToggleBillLock,
          t: translate
        } = volatileCtxRef.current
        if (
          draft.type !== TransactionType.INCOME &&
          draft.type !== TransactionType.EXPENSE
        ) {
          return null
        }
        const linkedToBill =
          draft.type === TransactionType.EXPENSE &&
          Boolean(draft.billInstanceId)
        const locked = isLockedToBill(draft)

        const instanceId =
          draft.type === TransactionType.INCOME
            ? draft.incomeInstanceId
            : draft.billInstanceId
        const linked = Boolean(instanceId)

        return (
          <span className="flex items-center">
            <IconButton
              variant="text"
              color={linked ? 'subtle' : 'primary'}
              icon={linked ? <Unlink /> : <Link2 />}
              disabled={draft.excluded}
              title={
                linked
                  ? translate('statementImport.table.unlinkInstance')
                  : translate('statementImport.table.linkInstance')
              }
              aria-label={
                linked
                  ? translate('statementImport.table.unlinkInstance')
                  : translate('statementImport.table.linkInstance')
              }
              onClick={() => {
                if (linked) {
                  onDraftChange(
                    draft.id,
                    draft.type === TransactionType.INCOME
                      ? {
                          incomeInstanceId: ''
                        }
                      : {
                          billInstanceId: ''
                        }
                  )
                  return
                }
                onOpenInstancePicker(draft as InstancePickerDraft)
              }}
            />
            {linkedToBill ? (
              <IconButton
                variant="text"
                color="subtle"
                icon={locked ? <Lock /> : <LockOpen />}
                disabled={draft.excluded}
                title={
                  locked
                    ? translate('statementImport.table.unlockBillFields')
                    : translate('statementImport.table.lockBillFields')
                }
                aria-label={
                  locked
                    ? translate('statementImport.table.unlockBillFields')
                    : translate('statementImport.table.lockBillFields')
                }
                onClick={() => onToggleBillLock(draft)}
              />
            ) : null}
          </span>
        )
      }
    }),
    columnHelper.accessor('date', {
      id: 'date',
      header: t('common.date'),
      cell: (ctx) => {
        const draft = ctx.row.original
        const { onDraftChange } = volatileCtxRef.current
        return canEditDate(kind) ? (
          <DraftTextInput
            value={draft.date}
            type="date"
            disabled={draft.excluded}
            onChange={(date) =>
              onDraftChange(draft.id, {
                date
              })
            }
          />
        ) : (
          <DraftPlainText>{draft.date}</DraftPlainText>
        )
      },
      meta: {
        globalSearchable: true,
        searchValue: (row: TransactionDraft) => row.date
      }
    })
  ]

  // Transfers already show both accounts; other rows need it once several
  // statements share one table.
  if (showOriginAccount && kind !== TransactionType.TRANSFER) {
    columns.push(
      columnHelper.display({
        id: 'originAccount',
        header: t('common.account'),
        cell: (ctx) => (
          <DraftPlainText>
            {lookupName(accounts, ctx.row.original.originAccountId)}
          </DraftPlainText>
        ),
        meta: {
          globalSearchable: true,
          searchValue: (row: TransactionDraft) =>
            lookupName(accounts, row.originAccountId)
        }
      })
    )
  }

  if (kind === TransactionType.TRANSFER) {
    columns.push(
      columnHelper.accessor('originalDescription', {
        id: 'description',
        header: t('statementImport.table.description'),
        cell: (ctx) => (
          <DraftPlainText>
            {ctx.row.original.originalDescription}
          </DraftPlainText>
        ),
        meta: {
          globalSearchable: true,
          searchValue: (row: TransactionDraft) => row.originalDescription
        }
      })
    )
  } else {
    columns.push(
      columnHelper.accessor('name', {
        id: 'name',
        header: t('common.name'),
        cell: (ctx) => {
          const draft = ctx.row.original
          const { onDraftChange } = volatileCtxRef.current
          return canEditName(kind) ? (
            <DraftTextInput
              value={draft.name}
              disabled={draft.excluded || isLockedToBill(draft)}
              onChange={(name) =>
                onDraftChange(draft.id, {
                  name
                })
              }
            />
          ) : (
            <DraftPlainText>{draft.name}</DraftPlainText>
          )
        },
        meta: {
          globalSearchable: true,
          searchValue: (row: TransactionDraft) =>
            `${row.name} ${row.originalDescription}`
        }
      })
    )
  }

  columns.push(
    columnHelper.accessor('amount', {
      id: 'amount',
      header: t('common.amount'),
      cell: (ctx) => (
        <span className="block text-right type-label text-foreground">
          {formatSwedishMoney(ctx.row.original.amount)}
        </span>
      ),
      meta: {
        globalSearchable: true,
        searchValue: (row: TransactionDraft) => String(row.amount)
      }
    }),
    columnHelper.accessor('type', {
      id: 'type',
      header: t('statementImport.table.type'),
      cell: (ctx) => {
        const draft = ctx.row.original
        const { onDraftChange, t: translate } = volatileCtxRef.current
        return (
          <DraftSelect
            value={draft.type}
            disabled={draft.excluded}
            className="min-w-28"
            onChange={(type) =>
              onDraftChange(draft.id, {
                type: type as TransactionDraft['type']
              })
            }
          >
            {kind === 'uncategorized' ? (
              <option value="uncategorized">
                {translate('statementImport.transactionTypes.uncategorized')}
              </option>
            ) : null}
            <option value={TransactionType.INCOME}>
              {translate('transactions.income')}
            </option>
            <option value={TransactionType.TRANSFER}>
              {translate('common.transfer')}
            </option>
            <option value={TransactionType.EXPENSE}>
              {translate('transactions.expense')}
            </option>
          </DraftSelect>
        )
      },
      meta: {
        globalSearchable: true,
        searchValue: (row: TransactionDraft) => row.type
      }
    })
  )

  if (kind === TransactionType.INCOME) {
    columns.push(
      columnHelper.display({
        id: 'sender',
        header: t('statementImport.table.sender'),
        cell: (ctx) => {
          const draft = ctx.row.original
          const { onDraftChange, t: translate } = volatileCtxRef.current
          return (
            <DraftCombobox
              value={idOrNewNameToComboboxValue(
                draft.incomeSourceId,
                draft.newIncomeSourceName
              )}
              disabled={draft.excluded}
              placeholder={translate('statementImport.table.chooseSender')}
              options={lookupItemsToComboboxOptions(incomeSources)}
              allowCreate
              createLabel={translate('forms.addSender')}
              onChange={(value) => {
                const next = comboboxValueToIdAndNewName(value)
                onDraftChange(draft.id, {
                  incomeSourceId: next.id ?? '',
                  newIncomeSourceName: next.newName,
                  incomeInstanceId: ''
                })
              }}
            />
          )
        }
      }),
      columnHelper.display({
        id: 'category',
        header: t('common.category'),
        cell: (ctx) => {
          const draft = ctx.row.original
          const { onDraftChange, t: translate } = volatileCtxRef.current
          return (
            <DraftCombobox
              value={idOrNewNameToComboboxValue(
                draft.categoryId,
                draft.newCategoryName
              )}
              disabled={draft.excluded}
              placeholder={translate('statementImport.table.noCategory')}
              options={lookupItemsToComboboxOptions(categories)}
              allowCreate
              createLabel={translate('forms.createIncomeCategory')}
              onChange={(value) => {
                const next = comboboxValueToIdAndNewName(value)
                onDraftChange(draft.id, {
                  categoryId: next.id,
                  newCategoryName: next.newName
                })
              }}
            />
          )
        }
      })
    )
  }

  if (kind === TransactionType.EXPENSE) {
    columns.push(
      columnHelper.display({
        id: 'recipient',
        header: t('common.recipient'),
        cell: (ctx) => {
          const draft = ctx.row.original
          const { onDraftChange, t: translate } = volatileCtxRef.current
          return (
            <DraftCombobox
              value={idOrNewNameToComboboxValue(
                draft.recipientId,
                draft.newRecipientName
              )}
              disabled={draft.excluded || isLockedToBill(draft)}
              placeholder={translate('statementImport.table.chooseRecipient')}
              options={lookupItemsToComboboxOptions(recipients)}
              allowCreate
              createLabel={translate('forms.addRecipient')}
              onChange={(value) => {
                const next = comboboxValueToIdAndNewName(value)
                onDraftChange(draft.id, {
                  recipientId: next.id ?? '',
                  newRecipientName: next.newName,
                  billInstanceId: ''
                })
              }}
            />
          )
        }
      }),
      columnHelper.display({
        id: 'budget',
        header: t('common.budget'),
        cell: (ctx) => {
          const draft = ctx.row.original
          const { onDraftChange, t: translate } = volatileCtxRef.current
          const splits = activeBillSplits(draft)
          if (splits.length > 0) {
            return (
              <BillSplitsSummary
                label={translate('statementImport.table.billSplits', {
                  count: splits.length
                })}
                lines={splits.map((split) =>
                  [
                    lookupName(budgets, split.budgetId) ||
                      translate('statementImport.table.noBudget'),
                    formatSwedishMoney(split.amount)
                  ].join(': ')
                )}
              />
            )
          }
          return (
            <DraftSelect
              value={draft.budgetId ?? ''}
              disabled={draft.excluded || isLockedToBill(draft)}
              onChange={(budgetId) =>
                onDraftChange(draft.id, {
                  budgetId
                })
              }
            >
              <option value="">
                {translate('statementImport.table.noBudget')}
              </option>
              <SelectOptionList items={budgets} />
            </DraftSelect>
          )
        }
      }),
      columnHelper.display({
        id: 'category',
        header: t('common.category'),
        cell: (ctx) => {
          const draft = ctx.row.original
          const { onDraftChange, t: translate } = volatileCtxRef.current
          const splits = activeBillSplits(draft)
          if (splits.length > 0) {
            return (
              <BillSplitsSummary
                label={translate('statementImport.table.billSplits', {
                  count: splits.length
                })}
                lines={splits.map((split) =>
                  [
                    split.subtitle,
                    lookupName(categories, split.categoryId) ||
                      translate('statementImport.table.noCategory')
                  ].join(': ')
                )}
              />
            )
          }
          return (
            <DraftCombobox
              value={idOrNewNameToComboboxValue(
                draft.categoryId,
                draft.newCategoryName
              )}
              disabled={draft.excluded || isLockedToBill(draft)}
              placeholder={translate('statementImport.table.noCategory')}
              options={lookupItemsToComboboxOptions(categories)}
              allowCreate
              createLabel={translate('forms.createExpenseCategory')}
              onChange={(value) => {
                const next = comboboxValueToIdAndNewName(value)
                onDraftChange(draft.id, {
                  categoryId: next.id,
                  newCategoryName: next.newName
                })
              }}
            />
          )
        }
      })
    )
  }

  if (kind === TransactionType.TRANSFER) {
    columns.push(
      columnHelper.display({
        id: 'fromAccount',
        header: t('transfers.fromAccount'),
        cell: (ctx) => {
          const draft = ctx.row.original
          const { onDraftChange, t: translate } = volatileCtxRef.current
          const fromAccountId =
            draft.transferFromAccountId ?? draft.originAccountId
          if (fromAccountId === draft.originAccountId) {
            return (
              <DraftPlainText>
                {lookupName(accounts, draft.originAccountId)}
              </DraftPlainText>
            )
          }

          return (
            <DraftSelect
              value={fromAccountId}
              disabled={draft.excluded}
              onChange={(transferFromAccountId) =>
                onDraftChange(draft.id, {
                  transferFromAccountId
                })
              }
            >
              <option value="">
                {translate('statementImport.table.chooseAccount')}
              </option>
              <SelectOptionList items={accounts} />
            </DraftSelect>
          )
        }
      }),
      columnHelper.display({
        id: 'toAccount',
        header: t('transfers.toAccount'),
        cell: (ctx) => {
          const draft = ctx.row.original
          const { onDraftChange, t: translate } = volatileCtxRef.current
          const toAccountId = draft.transferToAccountId ?? draft.originAccountId
          if (toAccountId === draft.originAccountId) {
            return (
              <DraftPlainText>
                {lookupName(accounts, draft.originAccountId)}
              </DraftPlainText>
            )
          }

          return (
            <DraftSelect
              value={toAccountId}
              disabled={draft.excluded}
              onChange={(transferToAccountId) =>
                onDraftChange(draft.id, {
                  transferToAccountId
                })
              }
            >
              <option value="">
                {translate('statementImport.table.chooseAccount')}
              </option>
              <SelectOptionList items={accounts} />
            </DraftSelect>
          )
        }
      })
    )
  }

  columns.push(
    columnHelper.display({
      id: 'exclude',
      header: '',
      enableSorting: false,
      cell: (ctx) => {
        const draft = ctx.row.original
        const excluded = draft.excluded
        const { onDraftChange, t: translate } = volatileCtxRef.current
        return (
          <IconButton
            variant="text"
            color={excluded ? 'primary' : 'subtle'}
            icon={excluded ? <SaveIcon /> : <SaveOffIcon />}
            title={
              excluded
                ? translate('statementImport.table.includeRow')
                : translate('statementImport.table.excludeRow')
            }
            aria-label={
              excluded
                ? translate('statementImport.table.includeRow')
                : translate('statementImport.table.excludeRow')
            }
            onClick={() =>
              onDraftChange(draft.id, {
                excluded: !excluded
              })
            }
          />
        )
      }
    })
  )

  return columns.map((column) => ({
    ...column,
    enableSorting: false
  }))
}

function InstancePickerDialog({
  draft,
  rows,
  incomeInstances,
  billInstances,
  budgets,
  categories,
  incomeSources,
  onOpenChange,
  onApply
}: {
  draft: InstancePickerDraft | null
  rows: TransactionDraft[]
  incomeInstances: IncomeInstance[]
  billInstances: BillImportInstance[]
  budgets: ImportLookupItem[]
  categories: ImportLookupItem[]
  incomeSources: ImportLookupItem[]
  onOpenChange: (open: boolean) => void
  onApply: (draftId: string, patch: Partial<TransactionDraft>) => void
}) {
  const { t } = useTranslation()
  const [selectedInstanceId, setSelectedInstanceId] = useState('')
  const [showAll, setShowAll] = useState(false)
  const open = Boolean(draft)

  // Best fit first: every recurring bill has an instance per coming month, so
  // an unranked list buries the one the row belongs to.
  const ranked = useMemo<
    RankedInstance<IncomeInstance | BillImportInstance>[]
  >(() => {
    if (!draft) return []
    if (draft.type === TransactionType.INCOME) {
      return rankIncomeInstancesForDraft(
        draft,
        getAvailableIncomeInstances({
          draft,
          rows,
          incomeInstances
        })
      )
    }
    return rankBillInstancesForDraft(
      draft,
      getAvailableBillInstances({
        draft,
        rows,
        billInstances
      })
    )
  }, [
    billInstances,
    draft,
    incomeInstances,
    rows
  ])

  const likely = ranked.filter((item) => item.likely)
  const shortList =
    likely.length > 0 ? likely : ranked.slice(0, FALLBACK_INSTANCE_COUNT)
  const options = (showAll ? ranked : shortList).map((item) => item.instance)
  const hiddenCount = ranked.length - shortList.length

  const closeDialog = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedInstanceId('')
      setShowAll(false)
    }
    onOpenChange(nextOpen)
  }

  const handleApply = () => {
    if (!draft || !selectedInstanceId) return

    if (draft.type === TransactionType.INCOME) {
      const instance = incomeInstances.find(
        (item) => item.id === selectedInstanceId
      )
      if (instance) onApply(draft.id, buildIncomeInstancePatch(instance))
    } else {
      const instance = billInstances.find(
        (item) => item.id === selectedInstanceId
      )
      if (instance) onApply(draft.id, buildBillInstancePatch(instance))
    }

    closeDialog(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={closeDialog}
    >
      <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('statementImport.instancePicker.title')}</DialogTitle>
          <DialogDescription>
            {t('statementImport.instancePicker.description')}
          </DialogDescription>
        </DialogHeader>

        {options.length > 0 ? (
          <RadioGroup
            value={selectedInstanceId}
            onValueChange={setSelectedInstanceId}
            className="flex flex-col gap-2"
          >
            {options.map((instance) => {
              const radioId = `statement-import-instance-${instance.id}`
              const label =
                draft?.type === TransactionType.INCOME
                  ? getIncomeInstanceLabel(instance as IncomeInstance)
                  : getBillInstanceLabel(instance as BillImportInstance)
              const detail =
                draft?.type === TransactionType.INCOME
                  ? [
                      lookupName(
                        incomeSources,
                        (instance as IncomeInstance).incomeSourceId
                      ),
                      lookupName(
                        categories,
                        (instance as IncomeInstance).categoryId
                      )
                    ].filter(Boolean)
                  : [
                      (instance as BillImportInstance).recipient.name,
                      lookupName(
                        budgets,
                        (instance as BillImportInstance).budget?.id
                      ),
                      lookupName(
                        categories,
                        (instance as BillImportInstance).category?.id
                      )
                    ].filter(Boolean)

              return (
                <label
                  htmlFor={radioId}
                  key={instance.id}
                  className="flex cursor-pointer items-start gap-3 rounded-sm border border-input bg-card p-3"
                >
                  <RadioGroupItem
                    id={radioId}
                    value={instance.id}
                    className="translate-y-0.5"
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="type-label text-foreground">{label}</span>
                    <span className="type-body-small text-muted-foreground">
                      {formatSwedishMoney(instance.amount)}
                      {detail.length > 0 ? ` | ${detail.join(' | ')}` : ''}
                    </span>
                  </span>
                </label>
              )
            })}
          </RadioGroup>
        ) : (
          <p className="type-body text-muted-foreground">
            {t('statementImport.instancePicker.empty')}
          </p>
        )}

        {hiddenCount > 0 ? (
          <div className="flex">
            <Button
              variant="text"
              color="subtle"
              label={
                showAll
                  ? t('statementImport.instancePicker.showLikely')
                  : t('statementImport.instancePicker.showAll', {
                      count: ranked.length
                    })
              }
              onClick={() => setShowAll((current) => !current)}
            />
          </div>
        ) : null}

        <DialogFooter>
          <Button
            variant="text"
            color="subtle"
            label={t('common.cancel')}
            onClick={() => closeDialog(false)}
          />
          <Button
            label={t('common.apply')}
            disabled={!selectedInstanceId}
            onClick={handleApply}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ImportDraftTable({
  title,
  kind,
  rows,
  accounts,
  budgets,
  categories,
  recipients,
  incomeSources,
  incomeInstances,
  billInstances,
  showOriginAccount = false,
  onDraftChange
}: ImportDraftTableProps) {
  const { t } = useTranslation()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [bulkEditOpen, setBulkEditOpen] = useState(false)
  const [instancePickerDraft, setInstancePickerDraft] =
    useState<InstancePickerDraft | null>(null)
  const sortedRows = useMemo(
    () =>
      [
        ...rows
      ].sort(
        (a, b) =>
          (a.statementIndex ?? 0) - (b.statementIndex ?? 0) ||
          a.sourceRowNumber - b.sourceRowNumber
      ),
    [
      rows
    ]
  )
  const selectedCount = sortedRows.filter((row) =>
    selectedIds.has(row.id)
  ).length

  const handleSelectedChange = useCallback((id: string, selected: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (selected) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const onDraftChangeRef = useRef(onDraftChange)
  onDraftChangeRef.current = onDraftChange

  const handleDraftChange = useCallback(
    (id: string, patch: Partial<TransactionDraft>) => {
      if (patch.excluded) {
        setSelectedIds((current) => {
          const next = new Set(current)
          next.delete(id)
          return next
        })
      }
      onDraftChangeRef.current(id, patch)
    },
    []
  )

  const handleToggleBillLock = (draft: TransactionDraft) => {
    if (isLockedToBill(draft)) {
      handleDraftChange(draft.id, {
        billFieldsUnlocked: true
      })
      return
    }
    // Locking again puts the bill's values back.
    const instance = billInstances.find(
      (item) => item.id === draft.billInstanceId
    )
    handleDraftChange(
      draft.id,
      instance
        ? buildBillInstancePatch(instance)
        : {
            billFieldsUnlocked: false
          }
    )
  }

  const handleBulkApply = (values: BulkEditValues) => {
    for (const draft of sortedRows) {
      if (!selectedIds.has(draft.id) || draft.excluded) continue
      const patch = buildBulkPatch(draft, values, {
        incomeInstances,
        billInstances
      })
      if (Object.keys(patch).length > 0) {
        onDraftChange(draft.id, patch)
      }
    }
    setSelectedIds(new Set())
    setBulkEditOpen(false)
  }

  const volatileColumnCtxRef = useRef<ImportDraftColumnVolatileContext>({
    selectedIds,
    onSelectedChange: handleSelectedChange,
    onOpenInstancePicker: setInstancePickerDraft,
    onToggleBillLock: handleToggleBillLock,
    onDraftChange: handleDraftChange,
    t
  })
  volatileColumnCtxRef.current = {
    selectedIds,
    onSelectedChange: handleSelectedChange,
    onOpenInstancePicker: setInstancePickerDraft,
    onToggleBillLock: handleToggleBillLock,
    onDraftChange: handleDraftChange,
    t
  }

  const columns = useMemo(
    () =>
      createColumns(volatileColumnCtxRef, {
        kind,
        accounts,
        budgets,
        categories,
        recipients,
        incomeSources,
        showOriginAccount
      }),
    [
      accounts,
      budgets,
      categories,
      incomeSources,
      kind,
      recipients,
      showOriginAccount
    ]
  )

  const { table, globalFilter, setGlobalFilter, activeFilters } = useDataTable({
    data: sortedRows,
    columns,
    getRowId: getImportDraftRowId
  })

  return (
    <section className="flex flex-col gap-3 border-t border-gray-200 pt-4">
      <h2 className="type-heading-3 text-gray-950">{title}</h2>
      <DataTable
        table={table}
        columns={columns}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        activeFilters={activeFilters}
        actionButton={{
          label: t('common.edit'),
          icon: <EditIcon />,
          disabled: selectedCount === 0,
          onClick: () => setBulkEditOpen(true)
        }}
        toolbarLabels={{
          searchPlaceholder: t('common.search'),
          filter: t('common.filter'),
          pillRemoveAriaLabel: t('common.removeFilter')
        }}
        emptyMessage={t('common.noResultsFound')}
        getRowClassName={(row) =>
          row.excluded ? 'bg-gray-50 text-gray-500 hover:bg-gray-50' : undefined
        }
      />
      <ImportBulkEditDialog
        open={bulkEditOpen}
        selectedCount={selectedCount}
        sectionType={kind}
        accounts={accounts}
        budgets={budgets}
        categories={categories}
        recipients={recipients}
        incomeSources={incomeSources}
        incomeInstances={incomeInstances}
        billInstances={billInstances}
        onOpenChange={setBulkEditOpen}
        onApply={handleBulkApply}
      />
      <InstancePickerDialog
        draft={instancePickerDraft}
        rows={sortedRows}
        incomeInstances={incomeInstances}
        billInstances={billInstances}
        budgets={budgets}
        categories={categories}
        incomeSources={incomeSources}
        onOpenChange={(open) => {
          if (!open) setInstancePickerDraft(null)
        }}
        onApply={handleDraftChange}
      />
    </section>
  )
}
