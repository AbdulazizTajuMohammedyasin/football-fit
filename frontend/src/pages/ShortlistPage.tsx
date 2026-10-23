import { GitCompareArrows, RotateCcw } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import { useClub, useMeta, useShortlist, type ShortlistParams } from '@/api/queries'
import type { MetricDefinition, Recommendation, Shortlist } from '@/api/types'
import { MetricRow } from '@/components/MetricRow'
import { RoleSelect } from '@/components/RoleSelect'
import { SaveToShortlist } from '@/components/SaveToShortlist'
import { CoverageBadge, ScoreBar } from '@/components/score'
import { SourceLine } from '@/components/SourceLine'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatAge, formatNumber, formatScore } from '@/lib/format'
import {
  AGE_MAX,
  AGE_MIN,
  parseShortlistParams,
  toSearchParams,
  validateDraft,
  type FilterDraft,
} from '@/lib/shortlistParams'

const MAX_COMPARE = 4

function draftFrom(params: ShortlistParams | null): FilterDraft {
  return {
    minAge: params?.min_age?.toString() ?? '',
    maxAge: params?.max_age?.toString() ?? '',
    minMinutes: params?.min_minutes?.toString() ?? '',
  }
}

function ResultCard({
  rank,
  rec,
  metrics,
  selected,
  selectionFull,
  onToggle,
  clubSlug,
  roleKey,
}: {
  rank: number
  rec: Recommendation
  metrics: Map<string, MetricDefinition>
  clubSlug: string
  roleKey: string
  selected: boolean
  selectionFull: boolean
  onToggle: () => void
}) {
  const { player, fit, role_score: roleScore } = rec
  const checkboxId = `compare-${player.slug}`
  return (
    <li className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-start gap-4 p-4">
        <span className="w-6 pt-1 text-sm font-semibold tabular-nums text-muted-foreground">{rank}</span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/players/${player.slug}`} className="text-lg font-semibold hover:underline">
              {player.name}
            </Link>
            <Badge variant="secondary">{player.position}</Badge>
            {rec.plays_secondary && <Badge variant="outline">Out of position</Badge>}
            {rec.low_coverage && <CoverageBadge coverage={roleScore.coverage} />}
          </div>
          <p className="text-sm text-muted-foreground">
            {player.club?.name ?? 'No club'} · Age {formatAge(player.age)} · {formatNumber(player.minutes)} min
            {player.nationality && <> · {player.nationality}</>}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-32 space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">Fit score</span>
              <span className="text-xl font-semibold tabular-nums">{formatScore(fit.score)}</span>
            </div>
            <ScoreBar value={fit.score} label={`${player.name} fit score`} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id={checkboxId}
              checked={selected}
              disabled={!selected && selectionFull}
              onCheckedChange={onToggle}
            />
            <Label htmlFor={checkboxId} className="text-sm">
              Compare
            </Label>
          </div>
          <SaveToShortlist playerSlug={player.slug} playerName={player.name} clubSlug={clubSlug} roleKey={roleKey} />
        </div>
      </div>

      <details className="group border-t px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium text-primary">Why this score?</summary>
        <div className="mt-3 grid gap-6 lg:grid-cols-2">
          <section aria-label="Fit score components" className="space-y-3">
            <h4 className="text-sm font-semibold">Fit score components</h4>
            {fit.components.map((component) => (
              <div key={component.key} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>
                    {component.label}{' '}
                    <span className="text-xs text-muted-foreground">
                      (weight {Math.round(component.weight * 100)}%)
                    </span>
                  </span>
                  <span className="tabular-nums">{formatScore(component.value)}</span>
                </div>
                <ScoreBar value={component.value} label={component.label} />
                <p className="text-xs text-muted-foreground">{component.explanation}</p>
              </div>
            ))}
          </section>
          <section aria-label={`${roleScore.role_name} metrics`} className="space-y-2">
            <h4 className="text-sm font-semibold">
              {roleScore.role_name} metrics · role score {formatScore(roleScore.score)}
            </h4>
            {roleScore.components.map((component) => (
              <MetricRow
                key={component.metric}
                label={component.label}
                value={component.value}
                unit={metrics.get(component.metric)?.unit ?? 'per90'}
                percentile={component.percentile}
                higherIsBetter={component.higher_is_better}
                weight={component.weight}
              />
            ))}
          </section>
        </div>
      </details>
    </li>
  )
}

function FilterForm({
  params,
  defaultMinMinutes,
  onApply,
  onReset,
}: {
  params: ShortlistParams | null
  defaultMinMinutes: number
  onApply: (values: Pick<ShortlistParams, 'min_age' | 'max_age' | 'min_minutes'>) => void
  onReset: () => void
}) {
  const [draft, setDraft] = useState<FilterDraft>(() => draftFrom(params))
  const [draftError, setDraftError] = useState<string | null>(null)

  function applyFilters(event: FormEvent) {
    event.preventDefault()
    const error = validateDraft(draft)
    setDraftError(error)
    if (error) return
    const toNumber = (value: string) => (value.trim() === '' ? null : Number(value))
    onApply({
      min_age: toNumber(draft.minAge),
      max_age: toNumber(draft.maxAge),
      min_minutes: toNumber(draft.minMinutes),
    })
  }

  return (
    <form onSubmit={applyFilters} className="space-y-4" noValidate>
      <fieldset className="grid grid-cols-2 gap-3" disabled={!params}>
        <legend className="mb-1.5 text-sm font-medium">Age (on data date)</legend>
        <div className="space-y-1">
          <Label htmlFor="min-age" className="text-xs">
            Minimum
          </Label>
          <Input
            id="min-age"
            inputMode="numeric"
            placeholder={String(AGE_MIN)}
            value={draft.minAge}
            onChange={(event) => setDraft({ ...draft, minAge: event.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="max-age" className="text-xs">
            Maximum
          </Label>
          <Input
            id="max-age"
            inputMode="numeric"
            placeholder={String(AGE_MAX)}
            value={draft.maxAge}
            onChange={(event) => setDraft({ ...draft, maxAge: event.target.value })}
          />
        </div>
      </fieldset>
      <div className="space-y-1">
        <Label htmlFor="min-minutes">Minimum league minutes</Label>
        <Input
          id="min-minutes"
          inputMode="numeric"
          placeholder={String(defaultMinMinutes)}
          value={draft.minMinutes}
          disabled={!params}
          onChange={(event) => setDraft({ ...draft, minMinutes: event.target.value })}
        />
      </div>
      {draftError && (
        <p role="alert" className="text-sm text-destructive">
          {draftError}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={!params}>
          Apply
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onReset} disabled={!params}>
          <RotateCcw aria-hidden /> Reset
        </Button>
      </div>
    </form>
  )
}

function ResultsSummary({ data }: { data: Shortlist }) {
  return (
    <div className="space-y-1 text-sm text-muted-foreground">
      <p>
        {data.considered} players met the filters; {data.results.length} shown, ranked by fit score.
        {data.excluded_low_coverage > 0 &&
          !data.filters.include_low_coverage &&
          ` ${data.excluded_low_coverage} hidden because less than ${Math.round(data.reliable_coverage * 100)}% of the role's metric weight is recorded.`}
      </p>
      <p>
        {data.incumbent_best === null
          ? 'The club has no established player with a usable score in this role, so every candidate counts as filling an empty slot.'
          : `The club's best established player in this role scores ${formatScore(data.incumbent_best)}.`}
      </p>
    </div>
  )
}

export function ShortlistPage() {
  const { slug = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const meta = useMeta()
  const club = useClub(slug)

  const params = useMemo(() => parseShortlistParams(searchParams), [searchParams])
  const roleKnown = params !== null && meta.data?.roles.some((role) => role.key === params.role)
  const shortlist = useShortlist(slug, roleKnown ? params : null)

  const [selected, setSelected] = useState<string[]>([])

  const metrics = useMemo(
    () => new Map((meta.data?.metrics ?? []).map((metric) => [metric.key, metric])),
    [meta.data],
  )

  if (meta.isPending || club.isPending) return <LoadingState label="Loading shortlist" />
  if (meta.isError) return <ErrorState error={meta.error} onRetry={() => meta.refetch()} />
  if (club.isError) return <ErrorState error={club.error} onRetry={() => club.refetch()} title="Could not load club" />

  const role = meta.data.roles.find((item) => item.key === params?.role)

  function update(next: Partial<NonNullable<typeof params>>) {
    const base = params ?? { role: next.role ?? '' }
    setSelected([])
    setSearchParams(toSearchParams({ ...base, ...next } as NonNullable<typeof params>))
  }

  function resetFilters() {
    if (params) setSearchParams({ role: params.role })
  }

  function toggle(playerSlug: string) {
    setSelected((current) =>
      current.includes(playerSlug)
        ? current.filter((item) => item !== playerSlug)
        : current.length < MAX_COMPARE
          ? [...current, playerSlug]
          : current,
    )
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link to={`/clubs/${slug}`} className="text-sm text-muted-foreground hover:underline">
          ← {club.data.club.name} needs
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">
          {role ? `${role.name} shortlist` : 'Shortlist'} for {club.data.club.name}
        </h1>
        {role && <p className="max-w-3xl text-muted-foreground">{role.summary}</p>}
        <SourceLine meta={club.data} />
      </header>

      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside aria-label="Filters" className="space-y-5 rounded-lg border bg-card p-4 lg:self-start">
          <div className="space-y-1.5">
            <Label htmlFor="role">Role</Label>
            <RoleSelect
              id="role"
              roles={meta.data.roles}
              positions={meta.data.positions}
              allowed={club.data.available_roles}
              value={role?.key ?? ''}
              onChange={(value) => update({ role: value })}
            />
          </div>

          {role && (
            <div className="rounded-md bg-muted p-3 text-xs">
              <p className="mb-1 font-medium">Role metric weights</p>
              <ul className="space-y-0.5">
                {role.weights.map((weight) => (
                  <li key={weight.metric} className="flex justify-between gap-2">
                    <span>{weight.label}</span>
                    <span className="tabular-nums">{Math.round(weight.weight * 100)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Keyed on the URL so the inputs re-initialise on back/forward navigation. */}
          <FilterForm
            key={searchParams.toString()}
            params={params}
            defaultMinMinutes={club.data.thresholds.benchmark_min_minutes}
            onApply={(values) => update(values)}
            onReset={resetFilters}
          />

          <div className="space-y-3 border-t pt-4">
            <div className="flex items-start gap-2">
              <Checkbox
                id="include-low-coverage"
                checked={params?.include_low_coverage ?? false}
                disabled={!params}
                onCheckedChange={(checked) => update({ include_low_coverage: checked === true })}
              />
              <Label htmlFor="include-low-coverage" className="text-sm leading-snug font-normal">
                Include players with incomplete data
              </Label>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="include-secondary"
                checked={params?.include_secondary ?? false}
                disabled={!params}
                onCheckedChange={(checked) => update({ include_secondary: checked === true })}
              />
              <Label htmlFor="include-secondary" className="text-sm leading-snug font-normal">
                Include players listed here as a secondary position
              </Label>
            </div>
          </div>
        </aside>

        <section aria-label="Results" className="min-w-0 space-y-4">
          {!params ? (
            <EmptyState title="Choose a role to build a shortlist">
              Pick a role on the left, or start from a position on the club's needs page.
            </EmptyState>
          ) : !role ? (
            <EmptyState title="Unknown role">The role in the link is not recognised. Choose one on the left.</EmptyState>
          ) : shortlist.isPending ? (
            <LoadingState label="Ranking players" />
          ) : shortlist.isError ? (
            <ErrorState error={shortlist.error} onRetry={() => shortlist.refetch()} title="Could not build shortlist" />
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <ResultsSummary data={shortlist.data} />
                <Button asChild={selected.length >= 2} size="sm" disabled={selected.length < 2}>
                  {selected.length >= 2 ? (
                    <Link to={`/compare?players=${selected.join(',')}&role=${role.key}`}>
                      <GitCompareArrows aria-hidden /> Compare {selected.length}
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <GitCompareArrows aria-hidden /> Select 2–{MAX_COMPARE} to compare
                    </span>
                  )}
                </Button>
              </div>
              {shortlist.isFetching && (
                <p role="status" className="text-xs text-muted-foreground">
                  Updating…
                </p>
              )}
              {shortlist.data.results.length === 0 ? (
                <EmptyState title="No players match these filters">
                  Try widening the age range, lowering the minimum minutes or including players with incomplete
                  data.
                </EmptyState>
              ) : (
                <ol className="space-y-3">
                  {shortlist.data.results.map((rec, index) => (
                    <ResultCard
                      key={rec.player.slug}
                      rank={index + 1}
                      rec={rec}
                      metrics={metrics}
                      clubSlug={slug}
                      roleKey={role.key}
                      selected={selected.includes(rec.player.slug)}
                      selectionFull={selected.length >= MAX_COMPARE}
                      onToggle={() => toggle(rec.player.slug)}
                    />
                  ))}
                </ol>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
