import { Plus, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { useComparison, useMeta, usePlayerSearch } from '@/api/queries'
import type { Comparison } from '@/api/types'
import { RoleSelect } from '@/components/RoleSelect'
import { CoverageBadge, ScoreBar } from '@/components/score'
import { SourceLine } from '@/components/SourceLine'
import { PageBody, PageHeader } from '@/components/page'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MAX_PLAYERS, parsePlayers } from '@/lib/compareParams'
import { formatAge, formatMetric, formatNumber, formatScore, NOT_RECORDED, ordinal } from '@/lib/format'
import { cn } from '@/lib/utils'

function PlayerPicker({ selected, onAdd }: { selected: string[]; onAdd: (slug: string) => void }) {
  const [term, setTerm] = useState('')
  const search = usePlayerSearch(term)
  const full = selected.length >= MAX_PLAYERS
  const results = (search.data ?? []).filter((player) => !selected.includes(player.slug))

  return (
    <div className="space-y-2">
      <Label htmlFor="player-search" className="font-semibold">
        Add a player
      </Label>
      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          id="player-search"
          className="h-10 pl-9"
          placeholder={full ? `Maximum ${MAX_PLAYERS} players` : 'Search by name (2+ letters)'}
          value={term}
          disabled={full}
          onChange={(event) => setTerm(event.target.value)}
        />
      </div>
      {term.trim().length >= 2 && !full && (
        <div aria-live="polite">
          {search.isError ? (
            <p className="text-sm text-destructive">Search failed: {search.error.message}</p>
          ) : search.isPending ? (
            <p className="text-sm text-muted-foreground">Searching…</p>
          ) : results.length === 0 ? (
            <p className="text-sm text-muted-foreground">No players found.</p>
          ) : (
            <ul className="divide-y overflow-hidden rounded-md border bg-card shadow-sm">
              {results.map((player) => (
                <li key={player.slug}>
                  <button
                    type="button"
                    className="flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                    onClick={() => {
                      onAdd(player.slug)
                      setTerm('')
                    }}
                  >
                    <span>
                      <span className="font-medium">{player.name}</span>{' '}
                      <span className="text-muted-foreground">
                        {player.position} · {player.club?.name ?? 'No club'} · {formatAge(player.age)}
                      </span>
                    </span>
                    <Plus className="size-4 shrink-0" aria-label={`Add ${player.name}`} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

const SERIES = [
  { fill: 'bg-series-1', border: 'border-t-series-1' },
  { fill: 'bg-series-2', border: 'border-t-series-2' },
  { fill: 'bg-series-3', border: 'border-t-series-3' },
  { fill: 'bg-series-4', border: 'border-t-series-4' },
]

function ComparisonTable({ data }: { data: Comparison }) {
  const meta = useMeta()
  const units = new Map((meta.data?.metrics ?? []).map((metric) => [metric.key, metric.unit]))
  const entries = data.players

  // Highest percentile per metric among players who have the metric recorded.
  const best = new Map<string, number>()
  for (const weight of data.role.weights) {
    const values = entries
      .map((entry) => entry.role_score.components.find((c) => c.metric === weight.metric)?.percentile)
      .filter((value): value is number => value !== null && value !== undefined)
    if (values.length > 1) best.set(weight.metric, Math.max(...values))
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card" data-scroll-x>
      <Table className="table-fixed" style={{ minWidth: `${8 + entries.length * 10}rem` }}>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="sticky left-0 z-10 w-32 bg-card pl-4 align-bottom sm:w-56">Metric (weight)</TableHead>
            {entries.map((entry, index) => (
              <TableHead
                key={entry.player.slug}
                className={cn('h-auto border-t-4 py-3 align-top whitespace-normal', SERIES[index].border)}
              >
                <Link
                  to={`/players/${entry.player.slug}`}
                  className="font-display text-lg leading-tight font-semibold text-foreground hover:underline"
                >
                  {entry.player.name}
                </Link>
                <div className="mt-0.5 text-xs font-normal text-muted-foreground">
                  {entry.player.position}, {entry.player.club?.name ?? 'No club'}, age {formatAge(entry.player.age)}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableCell className="sticky left-0 z-10 bg-muted pl-4 font-semibold">Role score</TableCell>
            {entries.map((entry, index) => (
              <TableCell key={entry.player.slug} className="space-y-2 py-4 whitespace-normal">
                <span className="block font-display text-4xl leading-none font-bold tabular-nums">
                  {formatScore(entry.role_score.score)}
                </span>
                <ScoreBar
                  value={entry.role_score.score}
                  label={`${entry.player.name} role score`}
                  tone={SERIES[index].fill}
                />
                <div className="flex flex-wrap gap-1">
                  <CoverageBadge coverage={entry.role_score.coverage} />
                  {entry.out_of_position && (
                    <Badge variant="outline" className="rounded-sm">
                      Out of position
                    </Badge>
                  )}
                  {!entry.has_season && (
                    <Badge variant="outline" className="rounded-sm">
                      No season data
                    </Badge>
                  )}
                </div>
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell className="sticky left-0 z-10 bg-card pl-4 font-medium">League minutes</TableCell>
            {entries.map((entry) => (
              <TableCell key={entry.player.slug} className="font-display text-lg font-semibold tabular-nums">
                {formatNumber(entry.player.minutes)}
              </TableCell>
            ))}
          </TableRow>
          {data.role.weights.map((weight) => (
            <TableRow key={weight.metric}>
              <TableCell className="sticky left-0 z-10 bg-card pl-4 whitespace-normal">
                <span className="font-medium">{weight.label}</span>{' '}
                <span className="text-xs text-muted-foreground">({Math.round(weight.weight * 100)}%)</span>
              </TableCell>
              {entries.map((entry, index) => {
                const component = entry.role_score.components.find((c) => c.metric === weight.metric)
                const value = component?.value ?? null
                const percentile = component?.percentile ?? null
                const isBest = percentile !== null && best.get(weight.metric) === percentile
                return (
                  <TableCell key={entry.player.slug} className={cn('whitespace-normal', isBest && 'bg-accent')}>
                    {value === null ? (
                      <span className="text-xs italic text-muted-foreground">{NOT_RECORDED}</span>
                    ) : (
                      <div className="space-y-1.5">
                        <span className="flex flex-wrap items-baseline gap-x-1.5 tabular-nums">
                          <span className="font-display text-lg font-semibold">
                            {formatMetric(value, units.get(weight.metric) ?? 'per90')}
                          </span>
                          {percentile !== null && (
                            <span className="text-xs text-muted-foreground">
                              ({ordinal(Math.round(percentile))} pct.)
                            </span>
                          )}
                          {isBest && (
                            <span className="rounded-sm bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                              Best<span className="sr-only"> in comparison</span>
                            </span>
                          )}
                        </span>
                        <ScoreBar
                          value={percentile}
                          label={`${entry.player.name} ${weight.label} percentile`}
                          tone={SERIES[index].fill}
                        />
                      </div>
                    )}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function ComparePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const meta = useMeta()
  const players = useMemo(() => parsePlayers(searchParams.get('players')), [searchParams])
  const roleParam = searchParams.get('role')
  const comparison = useComparison(players, roleParam)

  function setPlayers(next: string[]) {
    const params: Record<string, string> = {}
    if (next.length) params.players = next.join(',')
    if (roleParam) params.role = roleParam
    setSearchParams(params)
  }

  function setRole(role: string) {
    const params: Record<string, string> = { role }
    if (players.length) params.players = players.join(',')
    setSearchParams(params)
  }

  const names = new Map((comparison.data?.players ?? []).map((entry) => [entry.player.slug, entry.player.name]))

  return (
    <>
      <PageHeader
        context="Side by side on one role profile"
        title="Compare players"
        meta={
          <p className="max-w-3xl">
            Compare 2–{MAX_PLAYERS} players on the same role profile. Percentiles are measured against players in
            the role's position with enough minutes, so out-of-position players are judged on the role's own
            standards.
          </p>
        }
      />

      <PageBody className="space-y-6">
        <div className="grid gap-5 rounded-lg border bg-card p-5 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:gap-8">
          <div className="space-y-3">
            <PlayerPicker selected={players} onAdd={(slug) => setPlayers([...players, slug])} />
            {players.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Selected players">
                {players.map((slug, index) => (
                  <li key={slug}>
                    <span className="inline-flex items-center gap-2 rounded-md border bg-background py-1 pr-1 pl-2.5 text-sm font-medium">
                      <span className={cn('size-2.5 rounded-full', SERIES[index]?.fill)} aria-hidden />
                      {names.get(slug) ?? slug}
                      <button
                        type="button"
                        className="grid size-7 place-items-center rounded-sm hover:bg-muted"
                        onClick={() => setPlayers(players.filter((item) => item !== slug))}
                        aria-label={`Remove ${names.get(slug) ?? slug}`}
                      >
                        <X className="size-3.5" aria-hidden />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="compare-role" className="font-semibold">
              Role profile
            </Label>
            {meta.data ? (
              <RoleSelect
                id="compare-role"
                roles={meta.data.roles}
                positions={meta.data.positions}
                allowed={comparison.data?.available_roles}
                value={comparison.data?.role.key ?? roleParam ?? ''}
                onChange={setRole}
              />
            ) : meta.isError ? (
              <p className="text-sm text-destructive">Could not load roles: {meta.error.message}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Loading roles…</p>
            )}
            {comparison.data && <p className="text-sm text-muted-foreground">{comparison.data.role.summary}</p>}
          </div>
        </div>

        {players.length < 2 ? (
          <EmptyState title="Add at least two players">
            Search above, or pick players from a club shortlist and choose “Compare”.
          </EmptyState>
        ) : comparison.isPending ? (
          <LoadingState label="Comparing players" rows={3} />
        ) : comparison.isError ? (
          <ErrorState error={comparison.error} title="Could not compare these players" />
        ) : (
          <div className="space-y-3">
            <SourceLine meta={comparison.data} />
            <p className="text-xs text-muted-foreground sm:hidden">Swipe the table sideways to see every player.</p>
            <ComparisonTable data={comparison.data} />
            <p className="text-xs text-muted-foreground">
              “Best” and the shaded cell mark the highest percentile among the compared players for that metric.
            </p>
          </div>
        )}
      </PageBody>
    </>
  )
}
