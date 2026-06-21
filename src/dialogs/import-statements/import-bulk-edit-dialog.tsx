import { type ReactNode, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type BillInstance,
  type IncomeInstance,
  TransactionType
} from '@/api/generated/types.gen'
import { Button } from '@/components/button/button'
import type { ComboboxValue } from '@/components/form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  getBillInstanceLabel,
  getIncomeInstanceLabel
} from '@/features/import-statements/classification/instance-matching'
import {
  DRAFT_CONTROL_CLASS_NAME,
  DraftCombobox,
  lookupItemsToComboboxOptions,
  SelectOptionList
} from '@/features/import-statements/components/import-table-fields'
import type {
  ImportLookupItem,
  TransactionDraft
} from '@/features/import-statements/types'

export const NO_CHANGE_VALUE = '__no_change__'

export type BulkEditValues = {
  type: TransactionDraft['type'] | typeof NO_CHANGE_VALUE
  name: string
  transferFromAccountId: string
  transferToAccountId: string
  billInstanceId: string
  incomeInstanceId: string
  budgetId: string
  recipient: ComboboxValue | null
  incomeSource: ComboboxValue | null
  category: ComboboxValue | null
}

const EMPTY_BULK_EDIT_VALUES: BulkEditValues = {
  type: NO_CHANGE_VALUE,
  name: '',
  transferFromAccountId: '',
  transferToAccountId: '',
  billInstanceId: '',
  incomeInstanceId: '',
  budgetId: '',
  recipient: null,
  incomeSource: null,
  category: null
}

function bulkComboboxId(value: ComboboxValue | null): string | null {
  if (!value || typeof value !== 'string') return null
  return value
}

type ImportBulkEditDialogProps = {
  open: boolean
  selectedCount: number
  sectionType: TransactionDraft['type']
  accounts: ImportLookupItem[]
  budgets: ImportLookupItem[]
  categories: ImportLookupItem[]
  recipients: ImportLookupItem[]
  incomeSources: ImportLookupItem[]
  incomeInstances: IncomeInstance[]
  billInstances: Array<
    Omit<BillInstance, 'dueDate'> & {
      dueDate: string | Date
    }
  >
  onOpenChange: (open: boolean) => void
  onApply: (values: BulkEditValues) => void
}

function BulkCombobox({
  label,
  value,
  placeholder,
  options,
  allowCreate,
  createLabel,
  onChange
}: {
  label: string
  value: ComboboxValue | null
  placeholder: string
  options: Array<{
    value: string
    label: string
  }>
  allowCreate?: boolean
  createLabel?: string
  onChange: (value: ComboboxValue | null) => void
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-2">
      <span
        className="type-label text-gray-800"
        id={id}
      >
        {label}
      </span>
      <DraftCombobox
        value={value}
        placeholder={placeholder}
        options={options}
        allowCreate={allowCreate}
        createLabel={createLabel}
        onChange={onChange}
      />
    </div>
  )
}

function BulkSelect({
  label,
  value,
  onChange,
  children
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-2">
      <label
        className="type-label text-gray-800"
        htmlFor={id}
      >
        {label}
      </label>
      <select
        id={id}
        className={DRAFT_CONTROL_CLASS_NAME}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </div>
  )
}

function BulkInput({
  label,
  value,
  onChange
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-2">
      <label
        className="type-label text-gray-800"
        htmlFor={id}
      >
        {label}
      </label>
      <input
        id={id}
        className={DRAFT_CONTROL_CLASS_NAME}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}

function sectionSupportsRecipient(type: TransactionDraft['type']): boolean {
  return type === TransactionType.EXPENSE
}

function sectionSupportsSender(type: TransactionDraft['type']): boolean {
  return type === TransactionType.INCOME
}

function sectionSupportsBudgetAndCategory(
  type: TransactionDraft['type']
): boolean {
  return type === TransactionType.EXPENSE
}

function sectionSupportsCategory(type: TransactionDraft['type']): boolean {
  return type === TransactionType.EXPENSE || type === TransactionType.INCOME
}

function sectionSupportsName(type: TransactionDraft['type']): boolean {
  return type === TransactionType.EXPENSE || type === TransactionType.INCOME
}

function sectionSupportsTransferAccount(
  type: TransactionDraft['type']
): boolean {
  return type === TransactionType.TRANSFER
}

export function ImportBulkEditDialog({
  open,
  selectedCount,
  sectionType,
  accounts,
  budgets,
  categories,
  recipients,
  incomeSources,
  incomeInstances,
  billInstances,
  onOpenChange,
  onApply
}: ImportBulkEditDialogProps) {
  const { t } = useTranslation()
  const [values, setValues] = useState<BulkEditValues>(EMPTY_BULK_EDIT_VALUES)

  const closeDialog = (nextOpen: boolean) => {
    if (!nextOpen) setValues(EMPTY_BULK_EDIT_VALUES)
    onOpenChange(nextOpen)
  }

  const handleApply = () => {
    onApply(values)
    setValues(EMPTY_BULK_EDIT_VALUES)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={closeDialog}
    >
      <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('statementImport.bulkEdit.title')}</DialogTitle>
          <DialogDescription>
            {t('statementImport.bulkEdit.description', {
              count: selectedCount
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          {sectionSupportsName(sectionType) ? (
            <BulkInput
              label={t('common.name')}
              value={values.name}
              onChange={(name) =>
                setValues((current) => ({
                  ...current,
                  name
                }))
              }
            />
          ) : null}

          <BulkSelect
            label={t('forms.transactionType')}
            value={values.type}
            onChange={(value) =>
              setValues((current) => ({
                ...current,
                type: value as BulkEditValues['type']
              }))
            }
          >
            <option value={NO_CHANGE_VALUE}>
              {t('statementImport.bulkEdit.noChange')}
            </option>
            {sectionType === 'uncategorized' ? (
              <option value="uncategorized">
                {t('statementImport.transactionTypes.uncategorized')}
              </option>
            ) : null}
            <option value={TransactionType.INCOME}>
              {t('transactions.income')}
            </option>
            <option value={TransactionType.TRANSFER}>
              {t('common.transfer')}
            </option>
            <option value={TransactionType.EXPENSE}>
              {t('transactions.expense')}
            </option>
          </BulkSelect>

          {sectionSupportsRecipient(sectionType) ? (
            <BulkCombobox
              label={t('common.recipient')}
              value={values.recipient}
              placeholder={t('statementImport.bulkEdit.noChange')}
              options={lookupItemsToComboboxOptions(recipients)}
              allowCreate
              createLabel={t('forms.addRecipient')}
              onChange={(recipient) =>
                setValues((current) => ({
                  ...current,
                  recipient,
                  billInstanceId: recipient ? '' : current.billInstanceId
                }))
              }
            />
          ) : null}

          {sectionSupportsSender(sectionType) ? (
            <BulkCombobox
              label={t('statementImport.table.sender')}
              value={values.incomeSource}
              placeholder={t('statementImport.bulkEdit.noChange')}
              options={lookupItemsToComboboxOptions(incomeSources)}
              allowCreate
              createLabel={t('forms.addSender')}
              onChange={(incomeSource) =>
                setValues((current) => ({
                  ...current,
                  incomeSource,
                  incomeInstanceId: incomeSource ? '' : current.incomeInstanceId
                }))
              }
            />
          ) : null}

          {sectionSupportsTransferAccount(sectionType) ? (
            <>
              <BulkSelect
                label={t('transfers.fromAccount')}
                value={values.transferFromAccountId || NO_CHANGE_VALUE}
                onChange={(value) =>
                  setValues((current) => ({
                    ...current,
                    transferFromAccountId:
                      value === NO_CHANGE_VALUE ? '' : value
                  }))
                }
              >
                <option value={NO_CHANGE_VALUE}>
                  {t('statementImport.bulkEdit.noChange')}
                </option>
                <SelectOptionList items={accounts} />
              </BulkSelect>
              <BulkSelect
                label={t('transfers.toAccount')}
                value={values.transferToAccountId || NO_CHANGE_VALUE}
                onChange={(value) =>
                  setValues((current) => ({
                    ...current,
                    transferToAccountId: value === NO_CHANGE_VALUE ? '' : value
                  }))
                }
              >
                <option value={NO_CHANGE_VALUE}>
                  {t('statementImport.bulkEdit.noChange')}
                </option>
                <SelectOptionList items={accounts} />
              </BulkSelect>
            </>
          ) : null}

          {sectionSupportsSender(sectionType) ? (
            <BulkSelect
              label={t('statementImport.table.incomeInstance')}
              value={values.incomeInstanceId || NO_CHANGE_VALUE}
              onChange={(value) =>
                setValues((current) => ({
                  ...current,
                  incomeInstanceId: value === NO_CHANGE_VALUE ? '' : value
                }))
              }
            >
              <option value={NO_CHANGE_VALUE}>
                {t('statementImport.bulkEdit.noChange')}
              </option>
              {incomeInstances
                .filter(
                  (instance) =>
                    !instance.transactionId &&
                    (() => {
                      const incomeSourceId = bulkComboboxId(values.incomeSource)
                      if (values.incomeSource && !incomeSourceId) return false
                      return (
                        !incomeSourceId ||
                        instance.incomeSourceId === incomeSourceId
                      )
                    })()
                )
                .map((instance) => (
                  <option
                    key={instance.id}
                    value={instance.id}
                  >
                    {getIncomeInstanceLabel(instance)}
                  </option>
                ))}
            </BulkSelect>
          ) : null}

          {sectionSupportsRecipient(sectionType) ? (
            <BulkSelect
              label={t('statementImport.table.billInstance')}
              value={values.billInstanceId || NO_CHANGE_VALUE}
              onChange={(value) =>
                setValues((current) => ({
                  ...current,
                  billInstanceId: value === NO_CHANGE_VALUE ? '' : value
                }))
              }
            >
              <option value={NO_CHANGE_VALUE}>
                {t('statementImport.bulkEdit.noChange')}
              </option>
              {billInstances
                .filter(
                  (instance) =>
                    !instance.transaction?.id &&
                    (() => {
                      const recipientId = bulkComboboxId(values.recipient)
                      if (values.recipient && !recipientId) return false
                      return (
                        !recipientId || instance.recipient.id === recipientId
                      )
                    })()
                )
                .map((instance) => (
                  <option
                    key={instance.id}
                    value={instance.id}
                  >
                    {getBillInstanceLabel(instance)}
                  </option>
                ))}
            </BulkSelect>
          ) : null}

          {sectionSupportsBudgetAndCategory(sectionType) ? (
            <BulkSelect
              label={t('common.budget')}
              value={values.budgetId || NO_CHANGE_VALUE}
              onChange={(value) =>
                setValues((current) => ({
                  ...current,
                  budgetId: value === NO_CHANGE_VALUE ? '' : value
                }))
              }
            >
              <option value={NO_CHANGE_VALUE}>
                {t('statementImport.bulkEdit.noChange')}
              </option>
              <SelectOptionList items={budgets} />
            </BulkSelect>
          ) : null}

          {sectionSupportsCategory(sectionType) ? (
            <BulkCombobox
              label={t('common.category')}
              value={values.category}
              placeholder={t('statementImport.bulkEdit.noChange')}
              options={lookupItemsToComboboxOptions(categories)}
              allowCreate
              createLabel={
                sectionType === TransactionType.INCOME
                  ? t('forms.createIncomeCategory')
                  : t('forms.createExpenseCategory')
              }
              onChange={(category) =>
                setValues((current) => ({
                  ...current,
                  category
                }))
              }
            />
          ) : null}
        </div>

        <DialogFooter>
          <Button
            variant="text"
            color="subtle"
            label={t('common.cancel')}
            onClick={() => closeDialog(false)}
          />
          <Button
            label={t('common.apply')}
            onClick={handleApply}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
