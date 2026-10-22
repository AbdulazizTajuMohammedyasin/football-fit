import { Badge } from '@/components/ui/badge'
import { formatPercent, formatScore, scoreTone } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Horizontal 0–100 bar with an accessible label. Null renders as an empty, hatched track. */
export function ScoreBar({
  value,
  label,
  className,
  invert = false,
}: {
  value: number | null | undefined
  label: string
  className?: string
  /** Colour high values as bad (need scores). */
  invert?: boolean
}) {
  const missing = value === null || value === undefined
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={missing ? undefined : value}
      aria-valuetext={missing ? 'Not available' : `${formatScore(value)} out of 100`}
      className={cn(
        'h-2 w-full overflow-hidden rounded-full bg-muted',
        missing &&
          'bg-[repeating-linear-gradient(45deg,var(--muted),var(--muted)_4px,var(--border)_4px,var(--border)_8px)]',
        className,
      )}
    >
      {!missing && (
        <div className={cn('h-full rounded-full', scoreTone(value, invert))} style={{ width: `${Math.max(value, 2)}%` }} />
      )}
    </div>
  )
}

export function CoverageBadge({ coverage, threshold = 0.7 }: { coverage: number; threshold?: number }) {
  const low = coverage < threshold
  return (
    <Badge
      variant="outline"
      className={cn(low ? 'border-amber-400 bg-warning text-warning-foreground' : 'text-muted-foreground')}
      title="Share of the role profile's metric weight that has recorded data"
    >
      {low ? 'Incomplete data · ' : 'Data '}
      {formatPercent(coverage)}
    </Badge>
  )
}

const NEED_STYLES: Record<string, string> = {
  high: 'bg-rose-100 text-rose-800 border-rose-200',
  medium: 'bg-amber-100 text-amber-900 border-amber-200',
  low: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  unknown: 'bg-muted text-muted-foreground',
}

export function NeedBadge({ level }: { level: string }) {
  const label = level === 'unknown' ? 'Unknown need' : `${level[0].toUpperCase()}${level.slice(1)} need`
  return (
    <Badge variant="outline" className={NEED_STYLES[level] ?? NEED_STYLES.unknown}>
      {label}
    </Badge>
  )
}
