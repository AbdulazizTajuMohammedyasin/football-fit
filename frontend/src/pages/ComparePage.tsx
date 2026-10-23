import { Plus, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { useComparison, useMeta, usePlayerSearch } from '@/api/queries'
import type { Comparison } from '@/api/types'
import { RoleSelect } from '@/components/RoleSelect'
import { CoverageBadge, ScoreBar } from '@/components/score'
import { SourceLine } from '@/components/SourceLine'
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
      <Label htmlFor="player-search">Add a player</Label>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" aria-hidden />
        <Input
          id="player-search"
          className="pl-8"
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
            <ul className="divide-y rounded-md border bg-card">
              {results.map((player) => (
                <li key={player.slug}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
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
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-44">Metric (weight)</TableHead>
            {entries.map((entry) => (
              <TableHead key={entry.player.slug} className="min-w-40 align-top">
                <Link to={`/players/${entry.player.slug}`} className="font-semibold text-foreground hover:underline">
                  {entry.player.name}
                </Link>
                <div className="text-xs font-normal">
                  {entry.player.position} · {entry.player.club?.name ?? 'No club'} · {formatAge(entry.player.age)}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className="bg-muted/40">
            <TableCell className="font-medium">Role score</TableCell>
            {entries.map((entry) => (
              <TableCell key={entry.player.slug} className="space-y-1">
                <span className="text-lg font-semibold tabular-nums">{formatScore(entry.role_score.score)}</span>
                <ScoreBar value={entry.role_score.score} label={`${entry.player.name} role score`} />
                <div className="flex flex-wrap gap-1">
                  <CoverageBadge coverage={entry.role_score.coverage} />
                  {entry.out_of_position && <Badge variant="outline">Out of position</Badge>}
                  {!entry.has_season && <Badge variant="outline">No season data</Badge>}
                </div>
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">League minutes</TableCell>
            {entries.map((entry) => (
              <TableCell key={entry.player.slug} className="tabular-nums">
                {formatNumber(entry.player.minutes)}
              </TableCell>
            ))}
          </TableRow>
          {data.role.weights.map((weight) => (
            <TableRow key={weight.metric}>
              <TableCell>
                {weight.label}{' '}
                <span className="text-xs text-muted-foreground">({Math.round(weight.weight * 100)}%)</span>
              </TableCell>
              {entries.map((entry) => {
                const component = entry.role_score.components.find((c) => c.metric === weight.metric)
                const value = component?.value ?? null
                const percentile = component?.percentile ?? null
                const isBest = percentile !== null && best.get(weight.metric) === percentile
                return (
                  <TableCell key={entry.player.slug} className={cn(isBest && 'bg-emerald-50')}>
                    {value === null ? (
                      <span className="text-xs italic text-muted-foreground">{NOT_RECORDED}</span>
                    ) : (
                      <span className="tabular-nums">
                        {formatMetric(value, units.get(weight.metric) ?? 'per90')}
                        {percentile !== null && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({ordinal(Math.round(percentile))} pct.)
                          </span>
                        )}
                        {isBest && <span className="sr-only"> (best in comparison)</span>}
                      </span>
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
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Compare players</h1>
        <p className="max-w-3xl text-muted-foreground">
          Compare 2–{MAX_PLAYERS} players on the same role profile. Percentiles are measured against players in the
          role's position with enough minutes, so out-of-position players are judged on the role's own standards.
        </p>
      </header>

      <div className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-2">
        <div className="space-y-3">
          <PlayerPicker selected={players} onAdd={(slug) => setPlayers([...players, slug])} />
          {players.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Selected players">
              {players.map((slug) => (
                <li key={slug}>
                  <Badge variant="secondary" className="gap-1 py-1 pr-1">
                    {names.get(slug) ?? slug}
                    <button
                      type="button"
                      className="rounded-sm p-0.5 hover:bg-background"
                      onClick={() => setPlayers(players.filter((item) => item !== slug))}
                      aria-label={`Remove ${names.get(slug) ?? slug}`}
                    >
                      <X className="size-3" aria-hidden />
                    </button>
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="compare-role">Role profile</Label>
          {meta.data ? (
            <RoleSelect
              id="compare-role"
              roles={meta.data.roles}
              positions={meta.data.positions}
              allowed={comparison.data?.available_roles}
              value={comparison.data?.role.key ?? roleParam ?? ''}
              onChange={setRole}
            />
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
        <div className="space-y-2">
          <SourceLine meta={comparison.data} />
          <ComparisonTable data={comparison.data} />
          <p className="text-xs text-muted-foreground">
            Shaded cells mark the highest percentile among the compared players for that metric.
          </p>
        </div>
      )}
    </div>
  )
}
