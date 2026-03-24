import { CheckIcon, Undo2Icon } from 'lucide-react'
import { useMemo } from 'react'
import { z } from 'zod'
import { Button } from '@/components/button/button'
import { useAppForm } from '@/hooks/form'
import { createZodValidator, safeValidateForm } from '@/lib/form-validation'

const chartSettingsSchema = z.object({
  accountIds: z.array(z.string())
})

type ChartSettingsFormValues = z.infer<typeof chartSettingsSchema>

export type DashboardChartSettingsDrawerProps = {
  accounts: {
    id: string
    name: string
  }[]
  selectedAccountIds: string[]
  onApply: (accountIds: string[]) => void
  onClose: () => void
}

export function DashboardChartSettingsDrawer({
  accounts,
  selectedAccountIds,
  onApply,
  onClose
}: DashboardChartSettingsDrawerProps) {
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
      ]
    } satisfies ChartSettingsFormValues,
    onSubmit: async ({ value }) => {
      const result = safeValidateForm(chartSettingsSchema, value)
      if (!result.success) {
        return
      }
      onApply(result.data.accountIds)
      onClose()
    }
  })

  const handleReset = () => {
    form.setFieldValue('accountIds', [
      ...allAccountIds
    ])
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
        <div className="min-h-0 flex-1 overflow-y-auto">
          <form.AppField
            name="accountIds"
            validators={{
              onChange: createZodValidator(chartSettingsSchema.shape.accountIds)
            }}
          >
            {(field) => (
              <field.CheckboxGroupField
                label="Konton"
                options={checkboxOptions}
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
