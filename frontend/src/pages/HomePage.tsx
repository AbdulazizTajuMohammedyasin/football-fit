import { ArrowRight, Search } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'

import { useClubs, useMeta } from '@/api/queries'
import type { ClubListItem } from '@/api/types'
import { Container } from '@/components/page'
import { DemoBadge, Tag } from '@/components/score'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

const STEPS = ['Choose a club', 'Read its needs', 'Open a role shortlist', 'Compare candidates'] as const

/** Decorative pitch markings behind the hero; carries no data. */
function PitchLines({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 105 68" className={className} fill="none" stroke="currentColor" strokeWidth="0.25" aria-hidden>
      <rect x="0.5" y="0.5" width="104" height="67" />
      <line x1="52.5" y1="0.5" x2="52.5" y2="67.5" />
      <circle cx="52.5" cy="34" r="9.15" />
      <circle cx="52.5" cy="34" r="0.6" fill="currentColor" />
      <rect x="88" y="13.85" width="16.5" height="40.3" />
      <rect x="99" y="24.85" width="5.5" height="18.3" />
      <rect x="0.5" y="13.85" width="16.5" height="40.3" />
      <rect x="0.5" y="24.85" width="5.5" height="18.3" />
      <path d="M88 26.7a9.15 9.15 0 0 0 0 14.6M17 26.7a9.15 9.15 0 0 1 0 14.6" />
    </svg>
  )
}

/** Provenance from the API only: each source, whether it is real, and its date. */
function ProvenanceStrip({ clubCount, className }: { clubCount?: number; className?: string }) {
  const meta = useMeta()
  if (!meta.data?.sources.length) return null
  return (
    <section aria-label="Data loaded" className={cn('border-b bg-paper/70', className)}>
      <Container className="type-label flex flex-wrap items-center gap-x-8 gap-y-3 py-4">
        {meta.data.sources.map((source) => (
          <span key={source.slug} className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span
              aria-hidden
              className={cn('size-2 rounded-full', source.is_demo ? 'bg-caution' : 'bg-signal shadow-[0_0_8px_var(--signal)]')}
            />
            <span>{source.name}</span>
            <span className="text-ink-2">
              {source.is_demo ? 'fictional' : 'real'}, as of {formatDate(source.as_of)}
            </span>
          </span>
        ))}
        {clubCount !== undefined && <span className="text-ink-2">{clubCount} clubs loaded</span>}
        <Link to="/methodology#sources" className="text-signal underline underline-offset-4 hover:no-underline sm:ml-auto">
          Licences and limits
        </Link>
      </Container>
    </section>
  )
}

function ClubRow({ club }: { club: ClubListItem }) {
  const code = club.short_name.length <= 4 ? club.short_name : null
  return (
    <Link
      to={`/clubs/${club.slug}`}
      className="group flex h-full min-h-16 items-center gap-3 rounded-lg border bg-paper/80 px-4 py-3 transition-[border-color,background-color,box-shadow] hover:border-signal/60 hover:bg-tissue hover:shadow-[0_0_32px_-12px_var(--signal)]"
    >
      {code && (
        <span className="font-display w-11 shrink-0 text-2xl font-bold text-ink-2 uppercase group-hover:text-signal">
          {code}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{club.name}</span>
        <span className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
          {club.squad_size} listed players
          {club.is_demo && <DemoBadge />}
        </span>
      </span>
      <ArrowRight
        className="size-4 shrink-0 text-ink-2 transition-transform group-hover:translate-x-0.5 group-hover:text-signal"
        aria-hidden
      />
    </Link>
  )
}

export function HomePage() {
  const clubs = useClubs()
  const navigate = useNavigate()
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

  const firstMatch = search.trim() ? filtered[0] : undefined

  function openFirst(event: FormEvent) {
    event.preventDefault()
    if (firstMatch) navigate(`/clubs/${firstMatch.slug}`)
  }

  return (
    <>
      <section className="stadium relative overflow-hidden">
        <PitchLines className="pointer-events-none absolute top-1/2 -right-40 hidden h-[135%] -translate-y-1/2 text-white/[0.09] lg:block" />
        <Container className="relative grid gap-8 py-10 sm:py-16 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-end lg:gap-16 lg:py-24">
          <div className="space-y-5">
            <p className="type-label text-signal uppercase">Squad needs · Role shortlists · Evidence</p>
            <h1 className="type-hero">
              What does your club <span className="glow">need?</span>
            </h1>
            <p className="max-w-xl text-lg text-ink-2">
              Read a Premier League squad position by position, then rank players who fit a role, with every
              score explained.
            </p>
          </div>
          <form onSubmit={openFirst} className="space-y-2" role="search">
            <Label htmlFor="club-search" className="type-label text-ink-2">
              Filter clubs
            </Label>
            <div className="flex items-stretch gap-1 rounded-lg border border-line-strong bg-bone/80 p-1 backdrop-blur focus-within:border-signal">
              <div className="relative flex-1">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-2" aria-hidden />
                <Input
                  id="club-search"
                  className="h-11 border-0 bg-transparent pl-9 focus-visible:shadow-none"
                  placeholder="Club name"
                  autoComplete="off"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Button type="submit" variant="signal" className="h-11" disabled={!firstMatch}>
                Open
              </Button>
            </div>
            <p className="min-h-5 text-sm text-ink-2" aria-live="polite">
              {firstMatch
                ? `Press Enter to open ${firstMatch.name}.`
                : search.trim() && clubs.data
                  ? 'No club matches that name.'
                  : 'Type to narrow the list below.'}
            </p>
          </form>
          <ol className="type-label hidden flex-wrap gap-2 text-ink-2 sm:flex lg:col-span-2">
            {STEPS.map((step, index) => (
              <li key={step} className="flex items-center gap-2 rounded-full border bg-bone/60 py-1.5 pr-3.5 pl-1.5">
                <span className="grid size-6 place-items-center rounded-full bg-signal/15 text-signal">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <ProvenanceStrip clubCount={clubs.data?.length} className="hidden sm:block" />

      <Container className="py-8 sm:py-10">
        <section aria-labelledby="clubs-heading" className="space-y-6">
          <h2 id="clubs-heading" className="sr-only">
            Choose a club
          </h2>
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
                  <h3 className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5 border-b pb-3">
                    <span className="type-section">{group[0].competition}</span>
                    {group[0].is_demo ? (
                      <Tag tone="caution">Fictional demo data</Tag>
                    ) : (
                      <Tag tone="signal">Real data</Tag>
                    )}
                    <span className="type-label text-ink-2">{sourceName}</span>
                    <span className="type-label text-ink-2 sm:ml-auto">
                      {group.length} {group.length === 1 ? 'club' : 'clubs'}
                    </span>
                  </h3>
                  <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {group.map((club) => (
                      <li key={club.slug}>
                        <ClubRow club={club} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </section>
      </Container>

      <ProvenanceStrip clubCount={clubs.data?.length} className="sm:hidden" />
    </>
  )
}
