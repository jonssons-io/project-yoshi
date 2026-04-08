import { CheckIcon, Undo2Icon } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { Button } from '@/components/button/button'
import { useAppForm } from '@/hooks/form'
import { createZodValidator, safeValidateForm } from '@/lib/form-validation'

const chartSettingsSchema = z.object({
  accountIds: z.array(z.string()),
  projectFromBillAndIncomeEstimates: z.boolean()
})

type ChartSettingsFormValues = z.infer<typeof chartSettingsSchema>

export type DashboardChartSettingsDrawerProps = {
  accounts: {
    id: string
    name: string
  }[]
  selectedAccountIds: string[]
  projectFromBillAndIncomeEstimates: boolean
  onApply: (settings: {
    accountIds: string[]
    projectFromBillAndIncomeEstimates: boolean
  }) => void
  onClose: () => void
}

export function DashboardChartSettingsDrawer({
  accounts,
  selectedAccountIds,
  projectFromBillAndIncomeEstimates,
  onApply,
  onClose
}: DashboardChartSettingsDrawerProps) {
  const { t } = useTranslation()
  const allAccountIds = useMemo(
    () => accounts.map((account) => account.id),
    [
      accounts
    ]
  )

  const checkboxOptions = useMemo(
    () =>
      accounts.map((account) => ({
        value: account.id,
        label: account.name
      })),
    [
      accounts
    ]
  )

  const form = useAppForm({
    defaultValues: {
      accountIds: [
        ...selectedAccountIds
      ],
      projectFromBillAndIncomeEstimates
    } satisfies ChartSettingsFormValues,
    onSubmit: async ({ value }) => {
      const result = safeValidateForm(chartSettingsSchema, value)
      if (!result.success) {
        return
      }
      onApply({
        accountIds: result.data.accountIds,
        projectFromBillAndIncomeEstimates:
          result.data.projectFromBillAndIncomeEstimates
      })
      onClose()
    }
  })

  const handleReset = () => {
    form.setFieldValue('accountIds', [
      ...allAccountIds
    ])
    form.setFieldValue('projectFromBillAndIncomeEstimates', false)
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <form
        className="flex min-h-0 flex-1 flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          form.handleSubmit()
        }}
      >
        <div className="min-h-0 flex-1 overflow-y-auto flex flex-col gap-6">
          <form.AppField
            name="accountIds"
            validators={{
              onChange: createZodValidator(chartSettingsSchema.shape.accountIds)
            }}
          >
            {(field) => (
              <field.CheckboxGroupField
                label={t('drawers.dashboardChartSettings.accountsLabel')}
                options={checkboxOptions}
              />
            )}
          </form.AppField>
          <form.AppField name="projectFromBillAndIncomeEstimates">
            {(field) => (
              <field.SwitchField
                label={t('dashboard.projectFromBillAndIncomeEstimates')}
                description={t(
                  'dashboard.projectFromBillAndIncomeEstimatesDesc'
                )}
              />
            )}
          </form.AppField>
        </div>
        <div className="flex shrink-0 flex-row flex-wrap justify-end gap-2 border-t border-gray-300 pt-4">
          <Button
            type="button"
            variant="outlined"
            color="primary"
            label="Återställ inställningar"
            icon={
              <Undo2Icon
                className="size-4 stroke-[1.5]"
                aria-hidden={true}
              />
            }
            onClick={handleReset}
          />
          <Button
            type="submit"
            variant="filled"
            color="primary"
            label="Spara"
            icon={
              <CheckIcon
                className="size-4 stroke-[1.5]"
                aria-hidden={true}
              />
            }
            onClick={() => {
              void 0
            }}
          />
        </div>
      </form>
    </div>
  )
}
