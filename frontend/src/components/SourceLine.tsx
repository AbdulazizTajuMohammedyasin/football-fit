import type { LeagueMeta } from '@/api/types'
import { formatDate } from '@/lib/format'

/** One-line provenance: competition, season, source and as-of date. */
export function SourceLine({ meta }: { meta: Partial<LeagueMeta> }) {
  if (!meta.source) return null
  return (
    <p className="text-sm text-muted-foreground">
      {meta.competition} · {meta.season ?? 'season unknown'} · Source: {meta.source.name}
      {meta.as_of && <> · as of {formatDate(meta.as_of)}</>}
    </p>
  )
}
