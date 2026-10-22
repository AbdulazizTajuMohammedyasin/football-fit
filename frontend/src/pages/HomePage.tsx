import { ChevronRight, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useClubs } from '@/api/queries'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const STEPS = [
  ['Choose a club', 'See the squad as the data records it: depth, minutes and age by position.'],
  ['Understand the needs', 'Each position is rated on quality gap, depth and ageing, with the evidence shown.'],
  ['Inspect the shortlist', 'Players are ranked for a specific role using role-specific metrics and data coverage.'],
] as const

export function HomePage() {
  const clubs = useClubs()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (clubs.data ?? []).filter((club) => club.name.toLowerCase().includes(term))
  }, [clubs.data, search])

  return (
    <div className="space-y-10">
      <section className="max-w-3xl space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">What does your club need?</h1>
        <p className="text-lg text-muted-foreground">
          Football Fit reads a squad position by position, explains where it is short, and ranks players who fit
          a specific role — using transparent, role-specific scoring you can inspect.
        </p>
      </section>

      <ol className="grid gap-4 sm:grid-cols-3">
        {STEPS.map(([title, body], index) => (
          <li key={title} className="rounded-lg border bg-card p-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-primary">Step {index + 1}</span>
            <p className="mt-1 font-medium">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </li>
        ))}
      </ol>

      <section aria-labelledby="clubs-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="clubs-heading" className="text-xl font-semibold">
            Choose a club
          </h2>
          <div className="w-full max-w-xs space-y-1">
            <Label htmlFor="club-search">Filter clubs</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" aria-hidden />
              <Input
                id="club-search"
                className="pl-8"
                placeholder="Club name"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
        </div>

        {clubs.isPending ? (
          <LoadingState label="Loading clubs" rows={3} />
        ) : clubs.isError ? (
          <ErrorState error={clubs.error} onRetry={() => clubs.refetch()} title="Could not load clubs" />
        ) : !clubs.data.length ? (
          <EmptyState title="No clubs loaded yet">
            Load the demo dataset with <code>python manage.py seed_demo</code>, or import licensed data with{' '}
            <code>import_players_csv</code>.
          </EmptyState>
        ) : !filtered.length ? (
          <EmptyState title={`No clubs match “${search}”`} />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((club) => (
              <li key={club.slug}>
                <Link
                  to={`/clubs/${club.slug}`}
                  className="group flex items-center justify-between rounded-lg border bg-card px-4 py-3 transition-colors hover:border-primary/50 hover:bg-accent focus-visible:outline-2"
                >
                  <span>
                    <span className="block font-medium">{club.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {club.competition} · {club.squad_size} players
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    {club.is_demo && <Badge variant="outline">Demo</Badge>}
                    <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
