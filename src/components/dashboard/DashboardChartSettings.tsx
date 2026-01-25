import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from '@/components/ui/popover'
import type { DateRangeOption } from '@/lib/dashboard-utils'

type DashboardChartSettingsProps = {
	accounts: { id: string; name: string }[]
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
	return (
		<div className="flex flex-col gap-6 p-4">
			<div className="space-y-4">
				<h3 className="text-lg font-medium">Date Range</h3>
				<div className="flex flex-wrap gap-2">
					<Button
						variant={dateRange === 'current-month' ? 'default' : 'outline'}
						onClick={() => onDateRangeChange('current-month')}
						size="sm"
					>
						Current Month
					</Button>
					<Button
						variant={dateRange === '3-months' ? 'default' : 'outline'}
						onClick={() => onDateRangeChange('3-months')}
						size="sm"
					>
						3 Months
					</Button>

					<Popover>
						<PopoverTrigger asChild>
							<Button
								variant={dateRange === 'custom' ? 'default' : 'outline'}
								size="sm"
							>
								<CalendarIcon className="mr-2 h-4 w-4" />
								Custom
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-auto p-0" align="start">
							<div className="p-4 space-y-4">
								<div>
									<p className="mb-2 text-sm font-medium">Start Date</p>
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
									<p className="mb-2 text-sm font-medium">End Date</p>
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
					<h3 className="text-lg font-medium">Accounts</h3>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => {
							const allSelected = selectedAccountIds.length === accounts.length
							onToggleAllAccounts(!allSelected)
						}}
					>
						{selectedAccountIds.length === accounts.length
							? 'Deselect All'
							: 'Select All'}
					</Button>
				</div>
				<div className="grid gap-2">
					{accounts.map((account) => (
						<div key={account.id} className="flex items-center space-x-2">
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
