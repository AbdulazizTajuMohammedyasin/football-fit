import { ChevronDown, GitCompareArrows, RotateCcw, SlidersHorizontal, X } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import { useClub, useMeta, useShortlist, type ShortlistParams } from '@/api/queries'
import type { MetricDefinition, Recommendation, Role, Shortlist } from '@/api/types'
import { MetricRow } from '@/components/MetricRow'
import { PageBody, PageHeader } from '@/components/page'
import { RoleSelect } from '@/components/RoleSelect'
import { SaveToShortlist } from '@/components/SaveToShortlist'
import { CoverageBadge, DemoBadge, PositionChip, ScoreBar } from '@/components/score'
import { SourceLine } from '@/components/SourceLine'
import { EmptyState, ErrorState, LoadingState, PageError, PageLoading } from '@/components/states'
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
import { cn } from '@/lib/utils'

const MAX_COMPARE = 4

function draftFrom(params: ShortlistParams | null): FilterDraft {
  return {
    minAge: params?.min_age?.toString() ?? '',
    maxAge: params?.max_age?.toString() ?? '',
    minMinutes: params?.min_minutes?.toString() ?? '',
  }
}

function ResultRow({
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
    <li className={cn('rounded-lg border bg-card transition-colors', selected && 'border-primary ring-1 ring-primary')}>
      <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-3 p-4 sm:grid-cols-[3rem_minmax(0,1fr)_10rem_auto] sm:items-center sm:gap-x-5 sm:p-5">
        <span
          className={cn(
            'font-display text-3xl leading-none font-bold tabular-nums sm:text-4xl',
            rank <= 3 ? 'text-primary' : 'text-muted-foreground/70',
          )}
        >
          <span className="sr-only">Rank </span>
          {rank}
        </span>
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/players/${player.slug}`} className="text-lg leading-tight font-semibold hover:text-primary hover:underline">
              {player.name}
            </Link>
            <PositionChip code={player.position} title={player.position_label} />
            {player.club?.is_demo && <DemoBadge />}
          </div>
          <p className="text-sm text-muted-foreground">
            {player.club?.name ?? 'No club'}, age {formatAge(player.age)}, {formatNumber(player.minutes)} min
            {player.nationality && <>, {player.nationality}</>}
          </p>
          {(rec.plays_secondary || rec.low_coverage) && (
            <div className="flex flex-wrap gap-1.5">
              {rec.plays_secondary && (
                <Badge variant="outline" className="rounded-sm">
                  Out of position
                </Badge>
              )}
              {rec.low_coverage && <CoverageBadge coverage={roleScore.coverage} />}
            </div>
          )}
        </div>
        <div className="col-start-3 row-start-1 w-24 space-y-1.5 sm:col-start-auto sm:row-start-auto sm:w-auto">
          <div className="flex items-baseline justify-end gap-2 sm:justify-between">
            <span className="hidden text-xs text-muted-foreground sm:inline">Fit score</span>
            <span className="font-display text-3xl leading-none font-bold tabular-nums">{formatScore(fit.score)}</span>
          </div>
          <ScoreBar value={fit.score} label={`${player.name} fit score`} />
          <span className="block text-right text-xs text-muted-foreground sm:hidden">fit score</span>
        </div>
        <div className="col-span-3 flex flex-wrap items-center gap-2 border-t pt-3 sm:col-span-1 sm:flex-col sm:items-stretch sm:border-0 sm:pt-0">
          <label
            htmlFor={checkboxId}
            className={cn(
              'flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input px-3 text-sm font-semibold',
              selected && 'border-primary bg-accent',
              !selected && selectionFull && 'cursor-not-allowed opacity-50',
            )}
          >
            <Checkbox id={checkboxId} checked={selected} disabled={!selected && selectionFull} onCheckedChange={onToggle} />
            Compare
          </label>
          <SaveToShortlist playerSlug={player.slug} playerName={player.name} clubSlug={clubSlug} roleKey={roleKey} />
        </div>
      </div>

      <details className="group border-t">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-primary hover:bg-accent/50 sm:px-5 [&::-webkit-details-marker]:hidden">
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
          Why this score?
        </summary>
        <div className="grid gap-8 border-t bg-background/60 px-4 py-5 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <section aria-label="Fit score components" className="space-y-3">
            <h4 className="font-display text-lg font-semibold">Fit score components</h4>
            <p className="text-xs text-muted-foreground">
              A weighted blend of the components below. Components without data are left out and the remaining
              weights rescaled.
            </p>
            <ul className="space-y-4">
              {fit.components.map((component) => (
                <li key={component.key} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium">
                      {component.label}{' '}
                      <span className="text-xs font-normal text-muted-foreground">
                        (weight {Math.round(component.weight * 100)}%)
                      </span>
                    </span>
                    <span className="font-display text-lg font-semibold tabular-nums">
                      {formatScore(component.value)}
                    </span>
                  </div>
                  <ScoreBar value={component.value} label={component.label} />
                  <p className="text-xs text-muted-foreground">{component.explanation}</p>
                </li>
              ))}
            </ul>
          </section>
          <section aria-label={`${roleScore.role_name} metrics`} className="min-w-0 space-y-3">
            <h4 className="font-display text-lg font-semibold">
              {roleScore.role_name} metrics, role score {formatScore(roleScore.score)}
            </h4>
            <div className="space-y-2.5">
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
            </div>
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
        <legend className="mb-1.5 text-sm font-semibold">Age (on data date)</legend>
        <div className="space-y-1">
          <Label htmlFor="min-age" className="text-xs text-muted-foreground">
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
          <Label htmlFor="max-age" className="text-xs text-muted-foreground">
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
        <Label htmlFor="min-minutes" className="font-semibold">
          Minimum league minutes
        </Label>
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
        <p role="alert" className="text-sm font-medium text-destructive">
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

function RoleWeights({ role }: { role: Role }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">Role metric weights</p>
      <ul className="space-y-2">
        {role.weights.map((weight) => (
          <li key={weight.metric} className="space-y-1 text-xs">
            <span className="flex justify-between gap-2">
              <span>{weight.label}</span>
              <span className="font-semibold tabular-nums">{Math.round(weight.weight * 100)}%</span>
            </span>
            <span className="block h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
              <span className="block h-full bg-pitch" style={{ width: `${weight.weight * 100}%` }} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ResultsSummary({ data }: { data: Shortlist }) {
  return (
    <div className="space-y-1 text-sm text-muted-foreground">
      <p>
        <span className="font-semibold text-foreground">
          {data.considered} players met the filters; {data.results.length} shown, ranked by fit score.
        </span>
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

/** Sticky bar listing the players picked for comparison. */
function CompareTray({
  selected,
  names,
  roleKey,
  onRemove,
  onClear,
}: {
  selected: string[]
  names: Map<string, string>
  roleKey: string
  onRemove: (slug: string) => void
  onClear: () => void
}) {
  if (!selected.length) return null
  return (
    <div className="sticky bottom-3 z-30 mt-4" role="region" aria-label="Players to compare">
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-pitch p-3 text-pitch-foreground shadow-lg shadow-pitch/20 sm:px-4">
        <span className="text-sm font-semibold">
          {selected.length} of {MAX_COMPARE} picked
        </span>
        <ul className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {selected.map((slug) => (
            <li key={slug}>
              <span className="inline-flex items-center gap-1 rounded-sm bg-white/10 py-1 pr-1 pl-2 text-sm">
                {names.get(slug) ?? slug}
                <button
                  type="button"
                  onClick={() => onRemove(slug)}
                  className="grid size-6 place-items-center rounded-sm hover:bg-white/15"
                  aria-label={`Remove ${names.get(slug) ?? slug} from comparison`}
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </span>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-pitch-foreground hover:bg-white/10 hover:text-pitch-foreground" onClick={onClear}>
            Clear
          </Button>
          {selected.length >= 2 ? (
            <Button asChild size="sm" className="bg-floodlight text-pitch hover:bg-floodlight/90">
              <Link to={`/compare?players=${selected.join(',')}&role=${roleKey}`}>
                <GitCompareArrows aria-hidden /> Compare {selected.length}
              </Link>
            </Button>
          ) : (
            <span className="text-sm text-pitch-muted">Pick one more to compare</span>
          )}
        </div>
      </div>
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
  const [filtersOpen, setFiltersOpen] = useState(false)

  const metrics = useMemo(
    () => new Map((meta.data?.metrics ?? []).map((metric) => [metric.key, metric])),
    [meta.data],
  )

  if (meta.isPending || club.isPending) return <PageLoading label="Loading shortlist" />
  if (meta.isError) return <PageError error={meta.error} onRetry={() => meta.refetch()} />
  if (club.isError) return <PageError error={club.error} onRetry={() => club.refetch()} title="Could not load club" />

  const role = meta.data.roles.find((item) => item.key === params?.role)
  const names = new Map((shortlist.data?.results ?? []).map((rec) => [rec.player.slug, rec.player.name]))

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
    <>
      <PageHeader
        back={{ to: `/clubs/${slug}`, label: `${club.data.club.name} needs` }}
        context={`Recruitment shortlist for ${club.data.club.name}`}
        title={`${role ? `${role.name} shortlist` : 'Shortlist'} for ${club.data.club.name}`}
        meta={<SourceLine meta={club.data} />}
      >
        {role && <p className="max-w-2xl text-lg">{role.summary}</p>}
      </PageHeader>

      <PageBody className="pt-6">
        <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-8">
          <div className="lg:hidden">
            <Button
              variant="outline"
              className="w-full justify-between"
              aria-expanded={filtersOpen}
              aria-controls="shortlist-filters"
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <span className="inline-flex items-center gap-2">
                <SlidersHorizontal aria-hidden /> Role and filters
              </span>
              <ChevronDown className={cn('transition-transform', filtersOpen && 'rotate-180')} aria-hidden />
            </Button>
          </div>
          <aside
            id="shortlist-filters"
            aria-label="Filters"
            className={cn(
              'space-y-5 rounded-lg border bg-card p-5 lg:sticky lg:top-20 lg:block lg:self-start',
              !filtersOpen && 'hidden',
            )}
          >
            <div className="space-y-1.5">
              <Label htmlFor="role" className="font-semibold">
                Role
              </Label>
              <RoleSelect
                id="role"
                roles={meta.data.roles}
                positions={meta.data.positions}
                allowed={club.data.available_roles}
                value={role?.key ?? ''}
                onChange={(value) => update({ role: value })}
              />
            </div>

            {role && <RoleWeights role={role} />}

            <div className="border-t pt-5">
              {/* Keyed on the URL so the inputs re-initialise on back/forward navigation. */}
              <FilterForm
                key={searchParams.toString()}
                params={params}
                defaultMinMinutes={club.data.thresholds.benchmark_min_minutes}
                onApply={(values) => update(values)}
                onReset={resetFilters}
              />
            </div>

            <div className="space-y-3 border-t pt-5">
              <div className="flex items-start gap-2.5">
                <Checkbox
                  id="include-low-coverage"
                  className="mt-0.5"
                  checked={params?.include_low_coverage ?? false}
                  disabled={!params}
                  onCheckedChange={(checked) => update({ include_low_coverage: checked === true })}
                />
                <Label htmlFor="include-low-coverage" className="text-sm leading-snug font-normal">
                  Include players with incomplete data
                </Label>
              </div>
              <div className="flex items-start gap-2.5">
                <Checkbox
                  id="include-secondary"
                  className="mt-0.5"
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
                Pick a role in the filters, or start from a position on the club's needs page.
              </EmptyState>
            ) : !role ? (
              <EmptyState title="Unknown role">The role in the link is not recognised. Choose one in the filters.</EmptyState>
            ) : shortlist.isPending ? (
              <LoadingState label="Ranking players" />
            ) : shortlist.isError ? (
              <ErrorState error={shortlist.error} onRetry={() => shortlist.refetch()} title="Could not build shortlist" />
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
                  <ResultsSummary data={shortlist.data} />
                  {shortlist.isFetching && (
                    <p role="status" className="text-xs font-medium text-primary">
                      Updating…
                    </p>
                  )}
                </div>
                {shortlist.data.results.length === 0 ? (
                  <EmptyState title="No players match these filters">
                    Try widening the age range, lowering the minimum minutes or including players with incomplete
                    data.
                  </EmptyState>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Tick “Compare” on two to {MAX_COMPARE} players to put them side by side.
                    </p>
                    <ol className={cn('space-y-3 transition-opacity', shortlist.isFetching && 'opacity-60')}>
                      {shortlist.data.results.map((rec, index) => (
                        <ResultRow
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
                  </>
                )}
                <CompareTray
                  selected={selected}
                  names={names}
                  roleKey={role.key}
                  onRemove={toggle}
                  onClear={() => setSelected([])}
                />
              </>
            )}
          </section>
        </div>
      </PageBody>
    </>
  )
}
