import { Badge } from '@/components/ui/badge'
import { formatPercent, formatScore, scoreTone } from '@/lib/format'
import { NEED_STYLES, needLabel } from '@/lib/need'
import { cn } from '@/lib/utils'

/** Horizontal 0–100 bar with an accessible label. Null renders as an empty, hatched track. */
export function ScoreBar({
  value,
  label,
  className,
  invert = false,
  tone,
}: {
  value: number | null | undefined
  label: string
  className?: string
  /** Colour high values as bad (need scores). */
  invert?: boolean
  /** Fixed fill class instead of the score band (comparison series). */
  tone?: string
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
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-muted', missing && 'hatched', className)}
    >
      {!missing && (
        <div
          className={cn('h-full rounded-full transition-[width] duration-300', tone ?? scoreTone(value, invert))}
          style={{ width: `${Math.max(value, 2)}%` }}
        />
      )}
    </div>
  )
}

/** A score set in the condensed scoreboard face. Missing scores show a dash, never zero. */
export function ScoreFigure({
  value,
  className,
  label,
}: {
  value: number | null | undefined
  className?: string
  /** Visible caption under the number. */
  label?: string
}) {
  return (
    <span className={cn('inline-flex flex-col items-end leading-none', className)}>
      <span className="font-display text-3xl font-semibold tabular-nums">{formatScore(value)}</span>
      {label && <span className="mt-1 text-xs text-muted-foreground">{label}</span>}
    </span>
  )
}

/** Square position code, like a squad-sheet column. */
export function PositionChip({ code, title, className }: { code: string; title?: string; className?: string }) {
  return (
    <span
      title={title}
      className={cn(
        'inline-grid h-6 min-w-8 place-items-center rounded-sm bg-pitch px-1.5 font-display text-sm font-semibold text-pitch-foreground',
        className,
      )}
    >
      {code}
    </span>
  )
}

export function CoverageBadge({ coverage, threshold = 0.7 }: { coverage: number; threshold?: number }) {
  const low = coverage < threshold
  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-sm',
        low ? 'border-need-medium/40 bg-warning text-warning-foreground' : 'text-muted-foreground',
      )}
      title="Share of the role profile's metric weight that has recorded data"
    >
      {low ? 'Incomplete data · ' : 'Data '}
      {formatPercent(coverage)}
    </Badge>
  )
}

export function NeedBadge({ level, className }: { level: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn('rounded-sm font-semibold', (NEED_STYLES[level] ?? NEED_STYLES.unknown).badge, className)}>
      {needLabel(level)}
    </Badge>
  )
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <Badge variant="outline" className={cn('rounded-sm border-need-medium/40 bg-warning text-warning-foreground', className)}>
      Demo
    </Badge>
  )
}
