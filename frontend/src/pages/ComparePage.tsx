import { Plus, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { ApiError } from '@/api/client'
import { useComparison, useMeta, usePlayerLookups, usePlayerSearch } from '@/api/queries'
import type { CompareEntry, Comparison } from '@/api/types'
import { PageBody, PageHeader } from '@/components/page'
import { RoleSelect } from '@/components/RoleSelect'
import { CoverageBadge, ScoreBar, Tag } from '@/components/score'
import { SourceLine } from '@/components/SourceLine'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MAX_PLAYERS, parsePlayers } from '@/lib/compareParams'
import { formatAge, formatMetric, formatNumber, formatScore, NOT_RECORDED, ordinal } from '@/lib/format'
import { cn } from '@/lib/utils'

const LETTERS = ['A', 'B', 'C', 'D']

function PlayerPicker({ selected, onAdd }: { selected: string[]; onAdd: (slug: string) => void }) {
  const [term, setTerm] = useState('')
  const search = usePlayerSearch(term)
  const full = selected.length >= MAX_PLAYERS
  const results = (search.data ?? []).filter((player) => !selected.includes(player.slug))

  return (
    <div className="space-y-2">
      <Label htmlFor="player-search" className="text-sm font-normal">
        Add a player
      </Label>
      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-2" aria-hidden />
        <Input
          id="player-search"
          className="pl-9"
          placeholder={full ? `Maximum ${MAX_PLAYERS} players` : 'Search by name (2+ letters)'}
          autoComplete="off"
          value={term}
          disabled={full}
          onChange={(event) => setTerm(event.target.value)}
        />
      </div>
      {term.trim().length >= 2 && !full && (
        <div aria-live="polite">
          {search.isError ? (
            <p className="text-sm text-danger">Search failed: {search.error.message}</p>
          ) : search.isPending ? (
            <p className="text-sm text-ink-2">Searching…</p>
          ) : results.length === 0 ? (
            <p className="text-sm text-ink-2">No players found.</p>
          ) : (
            <ul className="divide-y overflow-hidden rounded-lg border bg-paper">
              {results.map((player) => (
                <li key={player.slug}>
                  <button
                    type="button"
                    className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left hover:bg-tissue"
                    onClick={() => {
                      onAdd(player.slug)
                      setTerm('')
                    }}
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{player.name}</span>
                      <span className="type-label text-ink-2">
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

function Letter({ index, className }: { index: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-grid size-6 shrink-0 place-items-center rounded-sm bg-ink font-mono text-xs text-on-ink', className)}
    >
      {LETTERS[index]}
    </span>
  )
}

/** One comparable row: a label and, per player, a value with an optional percentile. */
interface Row {
  key: string
  label: string
  weight?: number
  cells: { value: string | null; percentile: number | null; best: boolean }[]
}

function buildRows(data: Comparison, units: Map<string, 'per90' | 'pct'>): Row[] {
  const entries = data.players
  const metricRows: Row[] = data.role.weights.map((weight) => {
    const components = entries.map((entry) => entry.role_score.components.find((c) => c.metric === weight.metric))
    const percentiles = components
      .map((component) => component?.percentile)
      .filter((value): value is number => value !== null && value !== undefined)
    // Highest percentile among players who have the metric recorded; only meaningful with 2+ values.
    const best = percentiles.length > 1 ? Math.max(...percentiles) : null
    return {
      key: weight.metric,
      label: weight.label,
      weight: weight.weight,
      cells: components.map((component) => {
        const value = component?.value ?? null
        const percentile = component?.percentile ?? null
        return {
          value: value === null ? null : formatMetric(value, units.get(weight.metric) ?? 'per90'),
          percentile,
          best: percentile !== null && best === percentile,
        }
      }),
    }
  })
  return [
    {
      key: 'minutes',
      label: 'League minutes',
      cells: entries.map((entry) => ({
        value: entry.player.minutes === null ? null : formatNumber(entry.player.minutes),
        percentile: null,
        best: false,
      })),
    },
    ...metricRows,
  ]
}

function EntryBadges({ entry }: { entry: CompareEntry }) {
  return (
    <div className="flex flex-wrap gap-1">
      <CoverageBadge coverage={entry.role_score.coverage} />
      {entry.out_of_position && <Tag>Out of position</Tag>}
      {!entry.has_season && <Tag>No season data</Tag>}
    </div>
  )
}

function Cell({ cell, label }: { cell: Row['cells'][number]; label: string }) {
  if (cell.value === null) return <span className="text-sm text-ink-2 italic">{NOT_RECORDED}</span>
  return (
    <div className="space-y-1.5">
      <span className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 tabular-nums">
        <span className="text-lg">{cell.value}</span>
        {cell.percentile !== null && (
          <span className="type-label text-ink-2">{ordinal(Math.round(cell.percentile))} pct.</span>
        )}
        {cell.best && (
          <Tag tone="signal" className="py-0">
            Best<span className="sr-only"> in comparison</span>
          </Tag>
        )}
      </span>
      {cell.percentile !== null && <ScoreBar value={cell.percentile} label={`${label} percentile`} />}
    </div>
  )
}

function ComparisonView({ data }: { data: Comparison }) {
  const meta = useMeta()
  const units = new Map((meta.data?.metrics ?? []).map((metric) => [metric.key, metric.unit]))
  const entries = data.players
  const rows = buildRows(data, units)

  return (
    <>
      {/* Phones: one block per metric, every player listed underneath, so nothing scrolls sideways. */}
      <div className="space-y-3 md:hidden">
        <section className="rounded-xl border bg-paper p-4">
          <h3 className="type-label mb-3 text-ink-2">Role score</h3>
          <ul className="space-y-4">
            {entries.map((entry, index) => (
              <li key={entry.player.slug} className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <Letter index={index} />
                  <Link to={`/players/${entry.player.slug}`} className="min-w-0 flex-1 truncate hover:underline">
                    {entry.player.name}
                  </Link>
                  <span className="text-2xl leading-none tabular-nums">{formatScore(entry.role_score.score)}</span>
                </div>
                <ScoreBar value={entry.role_score.score} label={`${entry.player.name} role score`} />
                <EntryBadges entry={entry} />
              </li>
            ))}
          </ul>
        </section>
        {rows.map((row) => (
          <section key={row.key} className="rounded-xl border bg-paper p-4">
            <h3 className="mb-3 flex items-baseline justify-between gap-2">
              <span>{row.label}</span>
              {row.weight !== undefined && (
                <span className="type-label text-ink-2">weight {Math.round(row.weight * 100)}%</span>
              )}
            </h3>
            <ul className="space-y-3">
              {row.cells.map((cell, index) => (
                <li key={entries[index].player.slug} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-2.5">
                  <Letter index={index} className="mt-0.5" />
                  <Cell cell={cell} label={`${entries[index].player.name} ${row.label}`} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-xl border bg-paper md:block" data-scroll-x>
        <Table className="table-fixed" style={{ minWidth: `${12 + entries.length * 11}rem` }}>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="sticky left-0 z-10 w-48 bg-tissue pl-5 align-bottom lg:w-56">Metric (weight)</TableHead>
              {entries.map((entry, index) => (
                <TableHead key={entry.player.slug} className="h-auto py-3 align-top whitespace-normal">
                  <span className="flex items-start gap-2.5">
                    <Letter index={index} />
                    <span className="min-w-0">
                      <Link
                        to={`/players/${entry.player.slug}`}
                        className="block font-sans text-[15px] leading-tight text-ink hover:underline"
                      >
                        {entry.player.name}
                      </Link>
                      <span className="mt-0.5 block">
                        {entry.player.position}, {entry.player.club?.name ?? 'No club'}, age {formatAge(entry.player.age)}
                      </span>
                    </span>
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="hover:bg-transparent">
              <TableCell className="sticky left-0 z-10 bg-paper pl-5">Role score</TableCell>
              {entries.map((entry) => (
                <TableCell key={entry.player.slug} className="space-y-2 py-4 whitespace-normal">
                  <span className="block text-4xl leading-none tracking-tight tabular-nums">
                    {formatScore(entry.role_score.score)}
                  </span>
                  <ScoreBar value={entry.role_score.score} label={`${entry.player.name} role score`} />
                  <EntryBadges entry={entry} />
                </TableCell>
              ))}
            </TableRow>
            {rows.map((row) => (
              <TableRow key={row.key}>
                <TableCell className="sticky left-0 z-10 bg-paper pl-5 whitespace-normal">
                  {row.label}{' '}
                  {row.weight !== undefined && (
                    <span className="type-label text-ink-2">({Math.round(row.weight * 100)}%)</span>
                  )}
                </TableCell>
                {row.cells.map((cell, index) => (
                  <TableCell
                    key={entries[index].player.slug}
                    className={cn('whitespace-normal', cell.best && 'bg-tissue/60')}
                  >
                    <Cell cell={cell} label={`${entries[index].player.name} ${row.label}`} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}

export function ComparePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const meta = useMeta()
  const players = useMemo(() => parsePlayers(searchParams.get('players')), [searchParams])
  const roleParam = searchParams.get('role')
  const comparison = useComparison(players, roleParam)

  // When the API reports an unknown player, look each one up to find which.
  const notFound = comparison.error instanceof ApiError && comparison.error.status === 404
  const lookups = usePlayerLookups(players, notFound)
  const unknown = players.filter(
    (_, index) => lookups[index]?.error instanceof ApiError && (lookups[index].error as ApiError).status === 404,
  )

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

  const names = new Map<string, string>()
  players.forEach((slug, index) => {
    const name = lookups[index]?.data?.player.name
    if (name) names.set(slug, name)
  })
  for (const entry of comparison.data?.players ?? []) names.set(entry.player.slug, entry.player.name)

  return (
    <>
      <PageHeader
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
        <div className="grid gap-5 rounded-xl border bg-paper p-5 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:gap-8">
          <div className="space-y-3">
            <PlayerPicker selected={players} onAdd={(slug) => setPlayers([...players, slug])} />
            {players.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Selected players">
                {players.map((slug, index) => {
                  const missing = unknown.includes(slug)
                  return (
                    <li key={slug}>
                      <span
                        className={cn(
                          'inline-flex items-center gap-2 rounded-md border py-1 pr-1 pl-1.5 text-sm',
                          missing ? 'border-caution/40 bg-caution-bg text-caution' : 'bg-bone',
                        )}
                      >
                        <Letter index={index} />
                        {names.get(slug) ?? slug}
                        {missing && <span className="type-label">not found</span>}
                        <button
                          type="button"
                          className="grid size-8 cursor-pointer place-items-center rounded-sm hover:bg-tissue"
                          onClick={() => setPlayers(players.filter((item) => item !== slug))}
                          aria-label={`Remove ${names.get(slug) ?? slug}`}
                        >
                          <X className="size-3.5" aria-hidden />
                        </button>
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="compare-role" className="text-sm font-normal">
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
              <p className="text-sm text-danger">Could not load roles: {meta.error.message}</p>
            ) : (
              <p className="text-sm text-ink-2">Loading roles…</p>
            )}
            {comparison.data && <p className="text-sm text-ink-2">{comparison.data.role.summary}</p>}
          </div>
        </div>

        {players.length < 2 ? (
          <EmptyState title="Add at least two players">
            Search above, or pick players from a club shortlist and choose “Compare”.
          </EmptyState>
        ) : comparison.isPending ? (
          <LoadingState label="Comparing players" rows={3} />
        ) : comparison.isError ? (
          <ErrorState error={comparison.error} title="Could not compare these players">
            {unknown.length > 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-sm text-ink">
                  {unknown.length === 1 ? 'One player in this link is' : `${unknown.length} players in this link are`}{' '}
                  not in the current data. They may have been re-imported or removed.
                </p>
                <Button variant="outline" size="sm" onClick={() => setPlayers(players.filter((slug) => !unknown.includes(slug)))}>
                  Remove {unknown.length === 1 ? 'the unknown player' : 'unknown players'}
                </Button>
              </div>
            )}
          </ErrorState>
        ) : (
          <div className="space-y-3">
            <SourceLine meta={comparison.data} />
            <ComparisonView data={comparison.data} />
            <p className="text-sm text-ink-2">
              “Best” marks the highest percentile among the compared players for that metric.
            </p>
          </div>
        )}
      </PageBody>
    </>
  )
}
