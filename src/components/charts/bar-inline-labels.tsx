'use client'

import { useChart } from './chart-context'

export interface BarInlineLabelsProps {
  /** Row key holding the label text. Deliberately not `dataKey` — the chart
   *  treats any child carrying that prop as a bar series. */
  labelKey: string
  /** Row key holding the bar's value, used to find the bar's top edge. */
  valueKey: string
  /** Label colour. Default: white. */
  fill?: string
  /** Skip the label when the bar is shorter than this, in px. Default: 72 */
  minBarLength?: number
  /** Distance from the top of the bar to the start of the text, in px. Default: 14 */
  inset?: number
  fontSize?: number
}

/**
 * Vertical (rotated) text drawn inside each bar. Rendered as a post-overlay
 * layer so it sits above the fills, and pointer-transparent so it never eats
 * the chart's hover events.
 */
export function BarInlineLabels({
  labelKey,
  valueKey,
  fill = '#ffffff',
  minBarLength = 72,
  inset = 14,
  fontSize = 12,
}: BarInlineLabelsProps) {
  const { data, barScale, bandWidth, yScale, barXAccessor, innerHeight } = useChart()

  // Narrowed once here — the checks don't survive into the map callback.
  const scale = barScale
  const accessor = barXAccessor
  if (!(scale && accessor && bandWidth)) return null

  return (
    <g pointerEvents="none">
      {data.map((row, index) => {
        const label = row[labelKey]
        const value = row[valueKey]
        if (typeof label !== 'string' || typeof value !== 'number') return null

        const bandX = scale(accessor(row)) ?? 0
        const baselineY = yScale(0) ?? innerHeight
        const topY = yScale(value) ?? innerHeight
        const barLength = baselineY - topY
        if (barLength < minBarLength) return null

        const centerX = bandX + bandWidth / 2
        const startY = topY + inset
        return (
          <text
            dominantBaseline="central"
            fill={fill}
            fontSize={fontSize}
            fontWeight={600}
            key={`${label}-${index}`}
            letterSpacing="0.06em"
            textAnchor="start"
            transform={`rotate(90 ${centerX} ${startY})`}
            x={centerX}
            y={startY}
          >
            {label}
          </text>
        )
      })}
    </g>
  )
}

BarInlineLabels.displayName = 'BarInlineLabels'
// Render after the interaction overlay so the text stays on top of the fills.
;(BarInlineLabels as unknown as { __isPostOverlay: boolean }).__isPostOverlay = true
