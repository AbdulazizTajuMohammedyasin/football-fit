import { ScoreBar } from '@/components/score'
import { formatMetric, NOT_RECORDED, ordinal } from '@/lib/format'
import { cn } from '@/lib/utils'

/** One metric with its raw value and percentile. Missing values are shown as missing, never zero. */
export function MetricRow({
  label,
  value,
  unit,
  percentile,
  higherIsBetter,
  weight,
}: {
  label: string
  value: number | null
  unit: 'per90' | 'pct'
  percentile: number | null
  higherIsBetter: boolean
  weight?: number
}) {
  const missing = value === null
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,14rem)_6rem_minmax(0,1fr)_3rem]">
      <span className="text-sm font-medium">
        {label}
        {!higherIsBetter && <span className="ml-1 text-xs font-normal text-muted-foreground">(lower is better)</span>}
        {weight !== undefined && (
          <span className="ml-1 text-xs font-normal text-muted-foreground">· {Math.round(weight * 100)}%</span>
        )}
      </span>
      <span
        className={cn(
          'text-right font-display text-base font-semibold tabular-nums',
          missing && 'font-sans text-xs font-normal italic text-muted-foreground',
        )}
      >
        {missing ? NOT_RECORDED : formatMetric(value, unit)}
      </span>
      <ScoreBar
        value={percentile}
        label={`${label} percentile`}
        className="col-span-2 sm:col-span-1"
      />
      <span className="hidden text-right text-xs tabular-nums text-muted-foreground sm:block">
        {percentile === null ? '–' : ordinal(Math.round(percentile))}
      </span>
    </div>
  )
}
