import { format } from 'date-fns'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { LineChartMultiSeries } from '@/components/charts/line-chart-multi-series/line-chart-multi-series'
import type { ChartDataPoint } from '@/lib/dashboard-utils'
import { formatCurrency } from '@/lib/utils'

type DashboardAccountSeries = {
  id: string
  name: string
}

type DashboardMultiSeriesLineChartProps = {
  data: ChartDataPoint[]
  series: DashboardAccountSeries[]
}

/**
 * Dashboard balance history chart: wires i18n and currency formatting to the
 * multi-series line chart primitive.
 */
export function DashboardMultiSeriesLineChart({
  data,
  series
}: DashboardMultiSeriesLineChartProps) {
  const { t } = useTranslation()

  const formattedData = useMemo(
    () =>
      data.map((point) => ({
        ...point,
        date: point.originalDate
          ? format(point.originalDate instanceof Date ? point.originalDate : new Date(point.originalDate), 'MMM d')
          : point.date
      })),
    [data]
  )

  return (
    <LineChartMultiSeries
      data={formattedData}
      series={series}
      emptyMessage={t('common.noDataForSelectedPeriod')}
      totalLabel={t('common.total')}
      formatYAxisTick={(value) => `${value}`}
      formatValue={(value) => formatCurrency(value)}
    />
  )
}
