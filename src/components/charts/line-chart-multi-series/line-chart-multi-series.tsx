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

export type LineChartMultiSeriesPoint = {
  date: string
  originalDate?: string | Date
  [key: string]: string | number | Date | undefined
}

export type LineChartMultiSeriesSeriesMeta = {
  id: string
  name: string
}

type LineChartMultiSeriesProps = {
  data: LineChartMultiSeriesPoint[]
  series: LineChartMultiSeriesSeriesMeta[]
  emptyMessage: string
  totalLabel: string
  formatYAxisTick: (value: number) => string
  formatValue: (value: number) => string
}

type CustomTooltipItem = {
  dataKey?: string
  name?: string
  stroke?: string
  value?: number | string | null
  payload?: {
    originalDate?: string | Date
  }
}

type CustomTooltipProps = {
  active?: boolean
  payload?: CustomTooltipItem[]
  label?: string
  formatValue: (value: number) => string
  totalLabel: string
}

export function LineChartMultiSeries({
  data,
  series,
  emptyMessage,
  totalLabel,
  formatYAxisTick,
  formatValue
}: LineChartMultiSeriesProps) {
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {}

    series.forEach((acc, index) => {
      const colorIndex = (index % 5) + 1
      config[acc.id] = {
        label: acc.name,
        color: `var(--chart-${colorIndex})`
      }
    })

    return config
  }, [
    series
  ])

  if (!data || data.length === 0) {
    return (
      <div className="flex h-full min-h-40 w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-full min-h-40 w-full max-h-full"
    >
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
          tick={{
            fontSize: 12
          }}
          minTickGap={32}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{
            fontSize: 12
          }}
          tickFormatter={formatYAxisTick}
        />
        <ChartTooltip
          content={
            <CustomTooltip
              formatValue={formatValue}
              totalLabel={totalLabel}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <ReferenceLine
          y={0}
          stroke="var(--foreground)"
          strokeWidth={1}
          strokeDasharray=""
          strokeOpacity={0.25}
        />
        {series.map((acc) => (
          <Line
            key={acc.id}
            type="monotone"
            dataKey={acc.id}
            name={acc.name}
            stroke={`var(--color-${acc.id})`}
            strokeWidth={2}
            dot={{
              r: 2
            }}
          />
        ))}
      </LineChart>
    </ChartContainer>
  )
}

function CustomTooltip({
  active,
  payload,
  label,
  formatValue,
  totalLabel
}: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null

  const date = payload[0]?.payload?.originalDate
  const formattedLabel = date ? format(new Date(date), 'MMMM d, yyyy') : label

  const total = payload.reduce(
    (sum: number, item) => sum + (Number(item.value) || 0),
    0
  )

  return (
    <div className="border-border/50 bg-background grid min-w-50 items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium text-foreground">{formattedLabel}</div>
      <div className="grid gap-1.5">
        {payload.map((item) => (
          <div
            key={item.dataKey ?? item.name}
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
              {formatValue(Number(item.value) || 0)}
            </span>
          </div>
        ))}
      </div>
      <div className="border-t border-border pt-1.5">
        <div className="flex w-full items-center gap-2">
          <div className="h-2.5 w-2.5 shrink-0" />
          <span className="text-muted-foreground font-medium flex-1">
            {totalLabel}
          </span>
          <span className="text-foreground font-mono font-bold tabular-nums">
            {formatValue(total)}
          </span>
        </div>
      </div>
    </div>
  )
}
