'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BarChart } from '@/components/charts/bar-chart'
import { Bar } from '@/components/charts/bar'
import { Grid } from '@/components/charts/grid'
import { BarXAxis } from '@/components/charts/bar-x-axis'
import { YAxis } from '@/components/charts/y-axis'
import { BarInlineLabels } from '@/components/charts/bar-inline-labels'
import { ChartTooltip, TooltipContent, type TooltipRow } from '@/components/charts/tooltip'

type Granularity = 'daily' | 'weekly' | 'monthly'

const GRANULARITIES: { value: Granularity; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

const PERIOD_NOUN: Record<Granularity, string> = {
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
}

/** Semester is ordinal, so colour is a single-hue ramp keyed by the number itself. */
function semesterFill(semester: number): string {
  const step = Math.min(Math.max(semester, 1), 8)
  return `var(--chart-semester-${step})`
}

type SemesterRow = {
  semester: number
  name: string
  percentage: number
  present: number
  total: number
  hasClasses: boolean
  previous: number | null
}

type TrendResponse = {
  granularity: Granularity
  semesters: number[]
  period: { label: string } | null
  previousPeriod: { label: string } | null
  data: SemesterRow[]
}

const EMPTY: TrendResponse = {
  granularity: 'weekly',
  semesters: [],
  period: null,
  previousPeriod: null,
  data: [],
}

export function AttendanceTrendChart() {
  const [granularity, setGranularity] = useState<Granularity>('weekly')
  const [semester, setSemester] = useState<string>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-attendance-trend', granularity, semester],
    queryFn: async (): Promise<TrendResponse> => {
      const params = new URLSearchParams({ granularity, semester })
      const res = await fetch(`/api/dashboard/charts/attendance-trend?${params}`)
      const json = await res.json()
      return json.success && json.data ? json.data : EMPTY
    },
  })

  const response = data ?? EMPTY

  // Each bar carries its own step of the ramp.
  const rows = useMemo(
    () =>
      response.data.map((row) => ({
        ...row,
        tick: `Sem ${row.semester}`,
        fill: semesterFill(row.semester),
      })),
    [response.data]
  )

  const plotWidth = Math.max(300, rows.length * 96 + 130)

  const description = response.period
    ? `Attendance per semester — ${response.period.label}.`
    : `Attendance per semester, by ${PERIOD_NOUN[granularity]}.`

  const tooltipRows = (point: Record<string, unknown>): TooltipRow[] => {
    const row = point as unknown as SemesterRow & { fill: string }
    const result: TooltipRow[] = [
      {
        color: row.fill,
        label: 'Attendance',
        value: row.hasClasses ? `${row.percentage}% (${row.present}/${row.total})` : 'No classes',
      },
    ]
    if (row.previous !== null && row.hasClasses) {
      const delta = row.percentage - row.previous
      result.push({
        color: 'var(--chart-label)',
        label: `Previous ${PERIOD_NOUN[granularity]}`,
        value: `${row.previous}% (${delta >= 0 ? '+' : ''}${delta})`,
      })
    }
    return result
  }

  return (
    <Card className="xl:col-span-2">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="grid gap-2">
          <CardTitle>Attendance by Semester</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <Select value={semester} onValueChange={setSemester}>
            <SelectTrigger size="sm" className="w-[150px]">
              <SelectValue placeholder="All semesters" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All semesters</SelectItem>
              {response.semesters.map((value) => (
                <SelectItem key={value} value={String(value)}>
                  Semester {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={granularity}
            onValueChange={(value) => value && setGranularity(value as Granularity)}
          >
            {GRANULARITIES.map((option) => (
              <ToggleGroupItem key={option.value} value={option.value} className="px-3 text-xs">
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full rounded-lg" />
        ) : rows.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            No attendance data available
          </div>
        ) : (
          // The card spans two columns, but a handful of semester bars stretched
          // across all of it reads as empty space — cap the plot and centre it.
          <div className="mx-auto w-full" style={{ maxWidth: plotWidth }}>
            <BarChart
              data={rows}
              xDataKey="tick"
              aspectRatio="auto"
              className="h-[300px]"
              margin={{ top: 16, right: 12, bottom: 32, left: 46 }}
              barWidth={44}
              revealSignature={`${granularity}-${semester}`}
            >
              <Grid horizontal vertical={false} numTicksRows={4} />
              <YAxis numTicks={4} formatValue={(value) => `${value}%`} />
              <BarXAxis showAllLabels />
              <Bar dataKey="percentage" fill="var(--chart-semester-4)" fillKey="fill" lineCap={4} />
              <BarInlineLabels labelKey="name" valueKey="percentage" />
              <ChartTooltip
                showDatePill={false}
                showDots={false}
                content={({ point }) => (
                  <TooltipContent
                    title={String((point as { name?: string }).name ?? '')}
                    rows={tooltipRows(point)}
                  />
                )}
              />
            </BarChart>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
