import type { LeagueMeta } from '@/api/types'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Provenance in mono: competition and season, source and as-of date. */
export function SourceLine({ meta, className }: { meta: Partial<LeagueMeta>; className?: string }) {
  if (!meta.source) return null
  return (
    <p className={cn('type-label flex flex-wrap gap-x-5 gap-y-1 text-ink-2', className)}>
      <span>
        {meta.competition} {meta.season ?? 'season unknown'}
      </span>
      <span>Source: {meta.source.name}</span>
      {meta.as_of && <span>Data as of {formatDate(meta.as_of)}</span>}
    </p>
  )
}
