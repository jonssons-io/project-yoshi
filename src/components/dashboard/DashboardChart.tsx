import { format } from 'date-fns'
import { useMemo } from 'react'
import {
	CartesianGrid,
	Line,
	LineChart,
	ReferenceLine,
	XAxis,
	YAxis
} from 'recharts'
import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip
} from '@/components/ui/chart'
import type { ChartDataPoint } from '@/lib/dashboard-utils'
import { formatCurrency } from '@/lib/utils'

type DashboardChartProps = {
	data: ChartDataPoint[]
	accounts: Array<{ id: string; name: string }>
}

export function DashboardChart({ data, accounts }: DashboardChartProps) {
	const chartConfig = useMemo(() => {
		const config: ChartConfig = {
			// Define a base balance label if needed, though we use dynamic keys
		}

		// Assign colors to accounts
		accounts.forEach((acc, index) => {
			// Rotate through chart colors 1-5
			const colorIndex = (index % 5) + 1
			config[acc.id] = {
				label: acc.name,
				color: `var(--chart-${colorIndex})`
			}
		})

		return config
	}, [accounts])

	if (!data || data.length === 0) {
		return (
			<div className="flex h-[300px] w-full items-center justify-center text-muted-foreground border rounded-lg bg-card/50">
				No data available for the selected period
			</div>
		)
	}

	return (
		<ChartContainer config={chartConfig} className="min-h-[300px] w-full">
			<LineChart
				data={data}
				margin={{
					top: 10,
					right: 30,
					left: 0,
					bottom: 0
				}}
			>
				<CartesianGrid
					strokeDasharray="3 3"
					className="stroke-muted"
					vertical={false}
				/>
				<XAxis
					dataKey="date"
					tickLine={false}
					axisLine={false}
					tick={{ fontSize: 12 }}
					minTickGap={32}
				/>
				<YAxis
					tickLine={false}
					axisLine={false}
					tick={{ fontSize: 12 }}
					tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
				/>
				<ChartTooltip content={<CustomTooltip />} />
				<ChartLegend content={<ChartLegendContent />} />
				<ReferenceLine
					y={0}
					stroke="var(--foreground)"
					strokeWidth={1}
					strokeDasharray=""
					strokeOpacity={0.25}
				/>
				{accounts.map((acc) => (
					<Line
						key={acc.id}
						type="monotone"
						dataKey={acc.id}
						name={acc.name}
						stroke={`var(--color-${acc.id})`}
						strokeWidth={2}
						dot={false}
					/>
				))}
			</LineChart>
		</ChartContainer>
	)
}

function CustomTooltip({ active, payload, label }: any) {
	if (!active || !payload || !payload.length) return null

	const date = payload[0]?.payload?.originalDate
	const formattedLabel = date ? format(new Date(date), 'MMMM d, yyyy') : label

	const total = payload.reduce(
		(sum: number, item: any) => sum + (Number(item.value) || 0),
		0
	)

	return (
		<div className="border-border/50 bg-background grid min-w-[200px] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
			<div className="font-medium text-foreground mb-1">{formattedLabel}</div>
			<div className="grid gap-1.5">
				{payload.map((item: any) => (
					<div
						key={item.dataKey}
						className="flex w-full flex-wrap items-center gap-2"
					>
						<div
							className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
							style={{
								backgroundColor: item.stroke
							}}
						/>
						<span className="text-muted-foreground flex-1">{item.name}</span>
						<span className="text-foreground font-mono font-medium tabular-nums">
							{formatCurrency(item.value)}
						</span>
					</div>
				))}
			</div>
			<div className="my-1 border-t border-border" />
			<div className="flex w-full items-center gap-2">
				<div className="h-2.5 w-2.5 shrink-0" /> {/* Spacer for alignment */}
				<span className="text-muted-foreground font-medium flex-1">Total</span>
				<span className="text-foreground font-mono font-bold tabular-nums">
					{formatCurrency(total)}
				</span>
			</div>
		</div>
	)
}
