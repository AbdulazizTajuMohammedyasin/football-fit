import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useClubs, useMeta } from '@/api/queries'
import type { ClubListItem } from '@/api/types'
import { Container, PageBody, SectionHeading } from '@/components/page'
import { DemoBadge } from '@/components/score'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

const STEPS = [
  ['Choose a club', 'See the squad as the data records it: depth, minutes and age by position.'],
  ['Understand the needs', 'Each position is rated on quality gap, depth and ageing, with the evidence shown.'],
  ['Inspect the shortlist', 'Players are ranked for a specific role using role-specific metrics and data coverage.'],
  ['Compare candidates', 'Put two to four players side by side on the same role profile.'],
] as const

function SourcesPanel() {
  const meta = useMeta()
  if (!meta.data?.sources.length) return null
  return (
    <div className="rounded-lg border border-white/15 bg-white/[0.04] p-5">
      <h2 className="font-display text-lg font-semibold">Data loaded</h2>
      <ul className="mt-3 divide-y divide-white/10">
        {meta.data.sources.map((source) => (
          <li key={source.slug} className="flex items-start justify-between gap-4 py-3 text-sm">
            <span className="min-w-0">
              <span className="block font-medium text-pitch-foreground">{source.name}</span>
              <span className="text-pitch-muted">As of {formatDate(source.as_of)}</span>
            </span>
            <span
              className={cn(
                'shrink-0 rounded-sm px-2 py-0.5 text-xs font-semibold',
                source.is_demo ? 'bg-warning text-warning-foreground' : 'bg-floodlight text-pitch',
              )}
            >
              {source.is_demo ? 'Fictional' : 'Real'}
            </span>
          </li>
        ))}
      </ul>
      <Link to="/methodology#sources" className="mt-2 inline-block text-sm font-medium text-pitch-foreground underline-offset-4 hover:underline">
        Licences and limits of each source
      </Link>
    </div>
  )
}

function ClubTile({ club }: { club: ClubListItem }) {
  return (
    <Link
      to={`/clubs/${club.slug}`}
      className="group flex h-full flex-col justify-between gap-4 rounded-md border bg-card p-4 transition-colors hover:border-primary hover:bg-accent/60"
    >
      <span
        aria-hidden
        className="truncate font-display text-3xl leading-none font-bold tracking-tight text-primary group-hover:text-pitch"
      >
        {club.short_name}
      </span>
      <span>
        <span className="block font-semibold leading-snug">{club.name}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          {club.squad_size} listed players
          {club.is_demo && <DemoBadge />}
        </span>
      </span>
    </Link>
  )
}

export function HomePage() {
  const clubs = useClubs()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (clubs.data ?? []).filter((club) => club.name.toLowerCase().includes(term))
  }, [clubs.data, search])

  // One group per data source, so real and fictional clubs are never mixed together.
  const groups = useMemo(() => {
    const bySource = new Map<string, ClubListItem[]>()
    for (const club of filtered) {
      bySource.set(club.source_name, [...(bySource.get(club.source_name) ?? []), club])
    }
    return [...bySource.entries()]
  }, [filtered])

  return (
    <>
      <section className="pitch-band">
        <Container className="grid gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-end lg:py-20">
          <div className="space-y-6">
            <p className="text-sm font-medium text-pitch-muted">Premier League squad fit</p>
            <h1 className="font-display text-5xl leading-[0.92] font-bold tracking-tight sm:text-7xl">
              What does your club need?
            </h1>
            <p className="max-w-xl text-lg text-pitch-muted">
              Football Fit reads a squad position by position, explains where it is short, and ranks players who
              fit a specific role — using transparent, role-specific scoring you can inspect.
            </p>
            <ol className="grid max-w-2xl gap-x-6 gap-y-4 border-t border-white/15 pt-6 sm:grid-cols-2">
              {STEPS.map(([title, body], index) => (
                <li key={title} className="flex gap-3">
                  <span className="font-display text-2xl leading-none font-bold text-floodlight tabular-nums">
                    {index + 1}
                  </span>
                  <span>
                    <span className="block font-semibold text-pitch-foreground">{title}</span>
                    <span className="text-sm text-pitch-muted">{body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <SourcesPanel />
        </Container>
      </section>

      <PageBody>
        <section aria-labelledby="clubs-heading" className="space-y-6">
          <SectionHeading
            id="clubs-heading"
            title="Choose a club"
            description="Start from the squad, then follow its biggest needs to a shortlist."
            actions={
              <div className="w-full space-y-1 sm:w-72">
                <Label htmlFor="club-search">Filter clubs</Label>
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Input
                    id="club-search"
                    className="h-10 bg-card pl-9"
                    placeholder="Club name"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
              </div>
            }
          />

          {clubs.isPending ? (
            <LoadingState label="Loading clubs" rows={3} />
          ) : clubs.isError ? (
            <ErrorState error={clubs.error} onRetry={() => clubs.refetch()} title="Could not load clubs" />
          ) : !clubs.data.length ? (
            <EmptyState title="No clubs loaded yet">
              Import current Premier League data with <code>python manage.py import_fpl</code>, load the fictional
              demo league with <code>seed_demo</code>, or import licensed data with <code>import_players_csv</code>.
            </EmptyState>
          ) : !filtered.length ? (
            <EmptyState title={`No clubs match “${search}”`}>Check the spelling, or clear the filter.</EmptyState>
          ) : (
            <div className="space-y-10">
              {groups.map(([sourceName, group]) => (
                <section key={sourceName} aria-label={sourceName} className="space-y-3">
                  <h3 className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b pb-2">
                    <span className="font-display text-xl font-semibold">{group[0].competition}</span>
                    <span className="text-sm text-muted-foreground">{sourceName}</span>
                    {group[0].is_demo ? (
                      <Badge variant="outline" className="rounded-sm border-need-medium/40 bg-warning text-warning-foreground">
                        Fictional demo data
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="rounded-sm border-primary/30 bg-accent text-primary">
                        Real data
                      </Badge>
                    )}
                    <span className="ml-auto text-sm text-muted-foreground tabular-nums">{group.length} clubs</span>
                  </h3>
                  <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
                    {group.map((club) => (
                      <li key={club.slug}>
                        <ClubTile club={club} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </section>
      </PageBody>
    </>
  )
}
