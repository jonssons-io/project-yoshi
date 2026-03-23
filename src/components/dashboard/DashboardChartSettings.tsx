import { CalendarIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { BaseButton } from '@/components/base-button/base-button'
import { Button } from '@/components/button/button'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import type { DateRangeOption } from '@/lib/dashboard-utils'

type DashboardChartSettingsProps = {
  accounts: {
    id: string
    name: string
  }[]
  selectedAccountIds: string[]
  onToggleAccount: (id: string, checked: boolean) => void
  onToggleAllAccounts: (checked: boolean) => void
  dateRange: DateRangeOption
  onDateRangeChange: (range: DateRangeOption) => void
  customStartDate?: Date
  customEndDate?: Date
  onCustomDateChange: (start?: Date, end?: Date) => void
}

export function DashboardChartSettings({
  accounts,
  selectedAccountIds,
  onToggleAccount,
  onToggleAllAccounts,
  dateRange,
  onDateRangeChange,
  customStartDate,
  customEndDate,
  onCustomDateChange
}: DashboardChartSettingsProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">{t('dashboard.dateRange')}</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={dateRange === 'current-month' ? 'filled' : 'outlined'}
            color={dateRange === 'current-month' ? 'primary' : 'subtle'}
            onClick={() => onDateRangeChange('current-month')}
            label={t('dashboard.currentMonth')}
          />
          <Button
            variant={dateRange === '3-months' ? 'filled' : 'outlined'}
            color={dateRange === '3-months' ? 'primary' : 'subtle'}
            onClick={() => onDateRangeChange('3-months')}
            label={t('dashboard.threeMonths')}
          />

          <Popover>
            <PopoverTrigger asChild>
              <BaseButton
                variant={dateRange === 'custom' ? 'filled' : 'outlined'}
                color={dateRange === 'custom' ? 'primary' : 'subtle'}
              >
                <CalendarIcon />
                <span>{t('dashboard.custom')}</span>
              </BaseButton>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0"
              align="start"
            >
              <div className="p-4 space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium">
                    {t('dashboard.startDate')}
                  </p>
                  <Calendar
                    mode="single"
                    selected={customStartDate}
                    onSelect={(date) => {
                      onCustomDateChange(date, customEndDate)
                    }}
                    initialFocus
                  />
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium">
                    {t('dashboard.endDate')}
                  </p>
                  <Calendar
                    mode="single"
                    selected={customEndDate}
                    onSelect={(date) => {
                      onCustomDateChange(customStartDate, date)
                    }}
                    disabled={(date) =>
                      customStartDate ? date < customStartDate : false
                    }
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">{t('accounts.title')}</h3>
          <Button
            variant="text"
            color="subtle"
            onClick={() => {
              const allSelected = selectedAccountIds.length === accounts.length
              onToggleAllAccounts(!allSelected)
            }}
            label={
              selectedAccountIds.length === accounts.length
                ? t('dashboard.deselectAll')
                : t('dashboard.selectAll')
            }
          />
        </div>
        <div className="grid gap-2">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center space-x-2"
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
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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
