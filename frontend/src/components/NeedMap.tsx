import type { PositionNeed } from '@/api/types'
import { NeedMeter } from '@/components/score'
import { formatScore } from '@/lib/format'
import { needLabel } from '@/lib/need'
import { cn } from '@/lib/utils'

/**
 * Where each position code sits on a 105 × 68 pitch, attacking to the right. Detailed and
 * broad (FPL) positions share the same pitch; unknown codes fall back to a row along the bottom.
 */
const SPOTS: Record<string, [number, number]> = {
  GK: [7, 34],
  CB: [22, 34],
  FB: [27, 11],
  DF: [24, 34],
  DM: [39, 34],
  CM: [51, 34],
  MF: [51, 34],
  AM: [64, 34],
  W: [74, 11],
  ST: [86, 34],
  FW: [82, 34],
}

const LEGEND = ['high', 'medium', 'low', 'unknown'] as const

const MARKER: Record<string, string> = {
  high: 'bg-ink text-on-ink border-ink',
  medium: 'bg-paper text-ink border-ink border-2',
  low: 'bg-paper text-ink-2 border-line-strong',
  unknown: 'hatched text-ink-2 border-line-strong',
}

/** A top-down pitch with one marker per position; marker weight and the legend words show need. */
export function NeedMap({ needs, className }: { needs: PositionNeed[]; className?: string }) {
  let fallback = 0
  const placed = needs.map((need) => {
    const spot = SPOTS[need.position] ?? [12 + 16 * fallback++, 62]
    return { need, x: spot[0], y: spot[1] }
  })

  return (
    <figure className={cn('w-full', className)} aria-labelledby="need-map-caption">
      <div className="relative overflow-hidden rounded-xl border bg-paper">
        <svg viewBox="0 0 105 68" className="block h-auto w-full" aria-hidden>
          {Array.from({ length: 7 }, (_, i) => (
            <rect key={i} x={i * 15} y="0" width="7.5" height="68" className="fill-tissue/40" />
          ))}
          <g fill="none" className="stroke-line-strong/60" strokeWidth="0.3">
            <rect x="0.5" y="0.5" width="104" height="67" />
            <line x1="52.5" y1="0.5" x2="52.5" y2="67.5" />
            <circle cx="52.5" cy="34" r="9.15" />
            <rect x="0.5" y="13.85" width="16.5" height="40.3" />
            <rect x="0.5" y="24.85" width="5.5" height="18.3" />
            <rect x="88" y="13.85" width="16.5" height="40.3" />
            <rect x="99" y="24.85" width="5.5" height="18.3" />
          </g>
        </svg>
        {placed.map(({ need, x, y }) => (
          <a
            key={need.position}
            href={`#need-${need.position}`}
            aria-label={`${need.label}: ${needLabel(need.level).toLowerCase()}, score ${formatScore(need.score)}`}
            className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-md"
            style={{ left: `${(x / 105) * 100}%`, top: `${(y / 68) * 100}%` }}
          >
            <span
              className={cn(
                'grid size-11 place-items-center rounded-full border font-mono text-xs transition-transform group-hover:scale-105',
                MARKER[need.level] ?? MARKER.unknown,
              )}
            >
              {need.position}
            </span>
            <span className="rounded-sm bg-paper/90 px-1 text-xs tabular-nums text-ink">{formatScore(need.score)}</span>
          </a>
        ))}
      </div>
      <figcaption
        id="need-map-caption"
        className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-ink-2"
      >
        <span className="type-label text-ink">Need by position, 0–100</span>
        {LEGEND.filter((level) => needs.some((need) => need.level === level)).map((level) => (
          <NeedMeter key={level} level={level} className="text-xs" />
        ))}
      </figcaption>
    </figure>
  )
}
