import type { ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'
import { formatPercent, formatScore, scoreTone } from '@/lib/format'
import { NEED_SEGMENTS, needLabel } from '@/lib/need'
import { cn } from '@/lib/utils'

/** Horizontal 0–100 bar with an accessible label. Null renders as an empty, hatched track. */
export function ScoreBar({
  value,
  label,
  className,
}: {
  value: number | null | undefined
  label: string
  className?: string
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
      className={cn('h-1 w-full overflow-hidden rounded-full bg-tissue', missing && 'hatched h-1.5', className)}
    >
      {!missing && (
        <div
          className={cn('h-full rounded-full transition-[width] duration-300', scoreTone(value))}
          style={{ width: `${Math.max(value, 2)}%` }}
        />
      )}
    </div>
  )
}

/** Position code in mono, like a column on a squad sheet. */
export function PositionChip({ code, title, className }: { code: string; title?: string; className?: string }) {
  return (
    <span
      title={title}
      className={cn(
        'inline-grid h-6 min-w-8 place-items-center rounded-sm border border-ink/25 px-1.5 font-mono text-xs text-ink',
        className,
      )}
    >
      {code}
    </span>
  )
}

/** Small mono tag with an optional status dot. */
export function Tag({
  children,
  tone = 'neutral',
  className,
  title,
}: {
  children: ReactNode
  tone?: 'neutral' | 'caution' | 'signal'
  className?: string
  title?: string
}) {
  return (
    <Badge
      variant="outline"
      title={title}
      className={cn(
        tone === 'caution' && 'border-caution/30 bg-caution-bg text-caution',
        tone === 'neutral' && 'text-ink-2',
        className,
      )}
    >
      {tone !== 'neutral' && (
        <span
          aria-hidden
          className={cn('size-1.5 rounded-full', tone === 'caution' ? 'bg-caution' : 'bg-signal ring-1 ring-ink/30')}
        />
      )}
      {children}
    </Badge>
  )
}

export function CoverageBadge({ coverage, threshold = 0.7 }: { coverage: number; threshold?: number }) {
  const low = coverage < threshold
  return (
    <Tag tone={low ? 'caution' : 'neutral'} title="Share of the role profile's metric weight that has recorded data">
      {low ? 'Incomplete data · ' : 'Data '}
      {formatPercent(coverage)}
    </Tag>
  )
}

/** Three-segment meter plus the level word. Ink only: the word carries the meaning, not a colour. */
export function NeedMeter({
  level,
  className,
  onDark = false,
}: {
  level: string
  className?: string
  onDark?: boolean
}) {
  const filled = NEED_SEGMENTS[level] ?? 0
  const on = onDark ? 'bg-on-ink' : 'bg-ink'
  const off = onDark ? 'bg-line-on-ink' : 'bg-line'
  return (
    <span className={cn('inline-flex items-center gap-2 text-sm', className)}>
      <span aria-hidden className="inline-flex gap-0.5">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className={cn('h-3.5 w-1.5 rounded-[1px]', level === 'unknown' ? 'hatched' : index < filled ? on : off)}
          />
        ))}
      </span>
      {needLabel(level)}
    </span>
  )
}

/** Kept name for existing callers: a need meter with its word. */
export function NeedBadge({ level, className }: { level: string; className?: string }) {
  return <NeedMeter level={level} className={className} />
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <Tag tone="caution" className={className}>
      Demo
    </Tag>
  )
}
