import type { LeagueMeta } from '@/api/types'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Provenance: competition and season, source and as-of date. */
export function SourceLine({ meta, className }: { meta: Partial<LeagueMeta>; className?: string }) {
  if (!meta.source) return null
  return (
    <p className={cn('flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground', className)}>
      <span>
        {meta.competition} {meta.season ?? 'season unknown'}
      </span>
      <span>Source: {meta.source.name}</span>
      {meta.as_of && <span>Data as of {formatDate(meta.as_of)}</span>}
    </p>
  )
}
