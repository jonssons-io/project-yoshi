import { useTranslation } from 'react-i18next'
import { Button } from '@/components/button/button'
import { Checkbox } from '@/components/ui/checkbox'

type DashboardChartSettingsProps = {
  accounts: {
    id: string
    name: string
  }[]
  selectedAccountIds: string[]
  onToggleAccount: (id: string, checked: boolean) => void
  onDeselectAll: () => void
}

export function DashboardChartSettings({
  accounts,
  selectedAccountIds,
  onToggleAccount,
  onDeselectAll
}: DashboardChartSettingsProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="type-body-medium text-black">{t('accounts.title')}</h3>
          <Button
            variant="text"
            color="subtle"
            onClick={onDeselectAll}
            label={t('dashboard.deselectAll')}
          />
        </div>
        <div className="flex flex-col gap-2">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center gap-2"
            >
              <Checkbox
                id={`account-${account.id}`}
                checked={selectedAccountIds.includes(account.id)}
                onCheckedChange={(checked) =>
                  onToggleAccount(account.id, checked as boolean)
                }
              />
              <label
                htmlFor={`account-${account.id}`}
                className="type-body-medium text-black leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {account.name}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
