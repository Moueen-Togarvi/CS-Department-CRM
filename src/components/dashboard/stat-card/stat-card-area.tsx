'use client'

import { useId, useState } from 'react'
import { curveCardinal } from '@visx/curve'
import { LinearGradient } from '@visx/gradient'
import { Area } from '@/components/charts/area'
import { AreaChart } from '@/components/charts/area-chart'
import { ChartStatFlow } from '@/components/charts/chart-stat-flow'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  StatCardChart,
  statCardLabelClassName,
  statCardValueClassName,
} from './stat-card-chart'
import { StatCardHoverBridge, type StatCardHoverState } from './stat-card-hover-bridge'
import { TrendBadge } from './trend-badge'

export type StatPoint = { date: string; value: number }

export interface StatCardAreaProps {
  title: string
  /** Headline number shown when nothing is hovered. */
  total: number
  /** Caption under the number when nothing is hovered, e.g. "Currently enrolled". */
  label: string
  series: StatPoint[]
  /** Period-over-period change for the whole series. Omit to hide the badge. */
  trend?: number | null
  /** Turns a point's date into the caption shown while hovering it. */
  formatLabel: (date: Date) => string
  /** Stroke and fill colour — any CSS colour or custom property. */
  color?: string
  icon?: React.ElementType
  iconClassName?: string
  isLoading?: boolean
}

/**
 * Adapted from @bklit/stat-card-area-01. The registry block hardcodes a demo
 * revenue series; this takes the series, headline and formatting as props so
 * one component covers every dashboard stat.
 */
export function StatCardArea({
  title,
  total,
  label,
  series,
  trend,
  formatLabel,
  color = 'var(--chart-1)',
  icon: Icon,
  iconClassName,
  isLoading,
}: StatCardAreaProps) {
  const [hover, setHover] = useState<StatCardHoverState>({
    value: null,
    label: null,
    trend: null,
  })

  // Gradient ids share a document, so each card needs its own.
  const gradientId = `stat-card-area-fill-${useId().replace(/:/g, '')}`

  const displayValue = hover.value ?? total
  const displayLabel = hover.label ?? label
  const displayTrend = hover.trend ?? trend

  return (
    <Card className="w-full gap-0 py-0 shadow-sm">
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <CardAction>
          {displayTrend != null ? (
            <TrendBadge value={displayTrend} />
          ) : Icon ? (
            <Icon className={iconClassName ?? 'size-5 text-muted-foreground'} />
          ) : null}
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 px-4 pt-2 pb-3">
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-28" />
          </>
        ) : (
          <ChartStatFlow
            label={displayLabel}
            labelClassName={statCardLabelClassName}
            value={displayValue}
            valueClassName={statCardValueClassName}
          />
        )}

        <StatCardChart size="sm">
          {series.length > 1 && (
            <AreaChart
              aspectRatio="2.5 / 1"
              className="w-full"
              data={series}
              margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
              status={isLoading ? 'loading' : 'ready'}
            >
              <StatCardHoverBridge
                dataKey="value"
                formatLabel={formatLabel}
                onHoverChange={setHover}
              />
              <LinearGradient
                from={color}
                fromOpacity={0.45}
                id={gradientId}
                to={color}
                toOpacity={0}
              />
              <Area
                curve={curveCardinal.tension(0.65)}
                dataKey="value"
                fill={`url(#${gradientId})`}
                fillOpacity={1}
                gradientToOpacity={0}
                showHighlight
                stroke={color}
                strokeWidth={2}
              />
            </AreaChart>
          )}
        </StatCardChart>
      </CardContent>
    </Card>
  )
}
