import { ChevronDown, GitCompareArrows, RotateCcw, SlidersHorizontal, X } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import { ApiError } from '@/api/client'
import { useClub, useMeta, useShortlist, type ShortlistParams } from '@/api/queries'
import type { MetricDefinition, Recommendation, Role, Shortlist } from '@/api/types'
import { MetricRow } from '@/components/MetricRow'
import { Container, PageHeader } from '@/components/page'
import { RoleSelect } from '@/components/RoleSelect'
import { SaveToShortlist } from '@/components/SaveToShortlist'
import { CoverageBadge, DemoBadge, ScoreBar, Tag } from '@/components/score'
import { SourceLine } from '@/components/SourceLine'
import { EmptyState, ErrorState, LoadingState, PageError, PageLoading } from '@/components/states'
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

/** Desktop column template shared by the header row and every result row. */
const COLUMNS = 'xl:grid-cols-[2.25rem_minmax(0,1fr)_3rem_4.5rem_8rem_3rem_2.5rem_2.5rem]'

function draftFrom(params: ShortlistParams | null): FilterDraft {
  return {
    minAge: params?.min_age?.toString() ?? '',
    maxAge: params?.max_age?.toString() ?? '',
    minMinutes: params?.min_minutes?.toString() ?? '',
  }
}

function Evidence({ rec, metrics }: { rec: Recommendation; metrics: Map<string, MetricDefinition> }) {
  const { fit, role_score: roleScore } = rec
  return (
    <div className="grid gap-8 border-t bg-bone/70 px-4 py-5 xl:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <section aria-label="Fit score components" className="space-y-3">
        <h4 className="type-sub">Fit score components</h4>
        <p className="text-sm text-ink-2">
          A weighted blend of the components below. Components without data are left out and the remaining weights
          rescaled.
        </p>
        <ul className="space-y-4">
          {fit.components.map((component) => (
            <li key={component.key} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3 text-[15px]">
                <span>
                  {component.label}{' '}
                  <span className="type-label text-ink-2">weight {Math.round(component.weight * 100)}%</span>
                </span>
                <span className="text-lg tabular-nums">{formatScore(component.value)}</span>
              </div>
              <ScoreBar value={component.value} label={component.label} />
              <p className="text-sm text-ink-2">{component.explanation}</p>
            </li>
          ))}
        </ul>
      </section>
      <section aria-label={`${roleScore.role_name} metrics`} className="min-w-0 space-y-3">
        <h4 className="type-sub">
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
  )
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
  const [open, setOpen] = useState(false)
  const checkboxId = `compare-${player.slug}`
  const evidenceId = `evidence-${player.slug}`
  return (
    <li className={cn('border-b last:border-b-0', selected && 'bg-tissue/40 shadow-[inset_3px_0_0_var(--signal)]')}>
      <div
        className={cn(
          'grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 pt-2.5 pb-1 xl:gap-x-3 xl:px-5 xl:py-2',
          COLUMNS,
        )}
      >
        <span className={cn('text-lg tabular-nums xl:text-xl', rank <= 3 ? 'text-ink' : 'text-ink-2')}>
          <span className="sr-only">Rank </span>
          {rank}
        </span>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link to={`/players/${player.slug}`} className="font-medium hover:underline">
              {player.name}
            </Link>
            {player.club?.is_demo && <DemoBadge />}
            {rec.plays_secondary && <Tag>Out of position</Tag>}
            {rec.low_coverage && <CoverageBadge coverage={roleScore.coverage} />}
          </div>
          <p className="type-label text-ink-2 xl:truncate">
            {player.position} · {player.club?.name ?? 'No club'}
            <span className="xl:hidden">
              , age {formatAge(player.age)}, {formatNumber(player.minutes)} min
            </span>
            {player.nationality && <span className="hidden lg:inline">, {player.nationality}</span>}
          </p>
        </div>

        <span className="hidden text-right tabular-nums xl:block">{formatAge(player.age)}</span>
        <span className="hidden text-right tabular-nums xl:block">{formatNumber(player.minutes)}</span>

        <div className="w-20 space-y-1.5 xl:w-auto">
          <span className="block text-right text-2xl leading-none tracking-tight tabular-nums xl:text-left">
            {formatScore(fit.score)}
          </span>
          <ScoreBar value={fit.score} label={`${player.name} fit score`} />
        </div>

        <div className="col-span-3 flex flex-wrap items-center gap-2 xl:contents">
          <label
            htmlFor={checkboxId}
            className={cn(
              'flex h-11 cursor-pointer items-center gap-2 rounded-md px-2 text-sm xl:size-10 xl:justify-center xl:px-0',
              !selected && selectionFull && 'cursor-not-allowed opacity-45',
            )}
          >
            <Checkbox id={checkboxId} checked={selected} disabled={!selected && selectionFull} onCheckedChange={onToggle} />
            <span className="xl:sr-only">Compare</span>
            <span className="sr-only"> {player.name}</span>
          </label>
          <SaveToShortlist
            playerSlug={player.slug}
            playerName={player.name}
            clubSlug={clubSlug}
            roleKey={roleKey}
            className="xl:size-10 xl:px-0"
            labelClassName="xl:sr-only"
          />
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto size-11 xl:ml-0 xl:size-10"
            aria-expanded={open}
            aria-controls={evidenceId}
            aria-label={`Why this score? Evidence for ${player.name}`}
            onClick={() => setOpen((value) => !value)}
          >
            <ChevronDown className={cn('size-5 transition-transform', open && 'rotate-180')} aria-hidden />
          </Button>
        </div>
      </div>
      {open && (
        <div id={evidenceId}>
          <Evidence rec={rec} metrics={metrics} />
        </div>
      )}
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
        <legend className="mb-1.5 text-sm">Age (on data date)</legend>
        <div className="space-y-1">
          <Label htmlFor="min-age" className="type-label font-normal text-ink-2">
            Minimum
          </Label>
          <Input
            id="min-age"
            inputMode="numeric"
            placeholder={String(AGE_MIN)}
            value={draft.minAge}
            aria-invalid={draftError ? true : undefined}
            onChange={(event) => setDraft({ ...draft, minAge: event.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="max-age" className="type-label font-normal text-ink-2">
            Maximum
          </Label>
          <Input
            id="max-age"
            inputMode="numeric"
            placeholder={String(AGE_MAX)}
            value={draft.maxAge}
            aria-invalid={draftError ? true : undefined}
            onChange={(event) => setDraft({ ...draft, maxAge: event.target.value })}
          />
        </div>
      </fieldset>
      <div className="space-y-1">
        <Label htmlFor="min-minutes" className="text-sm font-normal">
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
        <p role="alert" className="text-sm text-danger">
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
    <div className="space-y-2.5">
      <p className="text-sm">Role metric weights</p>
      <ul className="space-y-2">
        {role.weights.map((weight) => (
          <li key={weight.metric} className="space-y-1 text-sm">
            <span className="flex justify-between gap-2">
              <span className="text-ink-2">{weight.label}</span>
              <span className="tabular-nums">{Math.round(weight.weight * 100)}%</span>
            </span>
            <span className="block h-1 overflow-hidden rounded-full bg-tissue" aria-hidden>
              <span className="block h-full bg-ink" style={{ width: `${weight.weight * 100}%` }} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ResultsSummary({ data }: { data: Shortlist }) {
  return (
    <div className="space-y-1 text-[15px] text-ink-2">
      <p>
        <span className="text-ink">
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
      <div className="flex items-center gap-3 rounded-xl bg-ink p-3 text-on-ink sm:px-4">
        <span className="type-label">
          {selected.length} of {MAX_COMPARE} picked
        </span>
        <ul className="hidden min-w-0 flex-1 flex-wrap gap-1.5 sm:flex">
          {selected.map((slug) => (
            <li key={slug}>
              <span className="inline-flex items-center gap-1 rounded-md bg-white/10 py-1 pr-1 pl-2.5 text-sm">
                {names.get(slug) ?? slug}
                <button
                  type="button"
                  onClick={() => onRemove(slug)}
                  className="grid size-7 cursor-pointer place-items-center rounded-sm hover:bg-white/15"
                  aria-label={`Remove ${names.get(slug) ?? slug} from comparison`}
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </span>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-on-ink hover:bg-white/10 hover:text-on-ink"
            onClick={onClear}
          >
            Clear
          </Button>
          {selected.length >= 2 ? (
            <Button asChild size="sm" variant="signal">
              <Link to={`/compare?players=${selected.join(',')}&role=${roleKey}`}>
                <GitCompareArrows aria-hidden /> Compare {selected.length}
              </Link>
            </Button>
          ) : (
            <span className="text-sm text-on-ink-2">Pick one more</span>
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
  const supportedRoles = meta.data.roles.filter((item) => club.data.available_roles.includes(item.key))
  // A 400 means the request itself cannot succeed (for example a role this club's data cannot score).
  const badRequest = shortlist.error instanceof ApiError && shortlist.error.status === 400

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
        title={`${role ? `${role.name} shortlist` : 'Shortlist'} for ${club.data.club.name}`}
        meta={<SourceLine meta={club.data} />}
      >
        {role && <p className="max-w-2xl text-lg text-ink-2">{role.summary}</p>}
      </PageHeader>

      <Container className="py-6 sm:py-8">
        <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-8">
          <div className="lg:hidden">
            <Button
              variant="outline"
              className="h-11 w-full justify-between"
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
              'space-y-5 rounded-xl border bg-paper p-5 lg:sticky lg:top-24 lg:block lg:self-start',
              !filtersOpen && 'hidden',
            )}
          >
            <div className="space-y-1.5">
              <Label htmlFor="role" className="text-sm font-normal">
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
              <ErrorState
                error={shortlist.error}
                onRetry={badRequest ? undefined : () => shortlist.refetch()}
                title="Could not build shortlist"
              >
                {badRequest && supportedRoles.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-sm text-ink">Roles this club's data can score:</p>
                    <ul className="flex flex-wrap gap-2">
                      {supportedRoles.map((item) => (
                        <li key={item.key}>
                          <Button asChild variant="outline" size="sm">
                            <Link to={`/clubs/${slug}/shortlist?role=${item.key}`}>{item.name}</Link>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </ErrorState>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <ResultsSummary data={shortlist.data} />
                  {shortlist.isFetching && (
                    <p role="status" className="type-label text-ink">
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
                  <div
                    className={cn(
                      'overflow-hidden rounded-xl border bg-paper transition-opacity',
                      shortlist.isFetching && 'opacity-60',
                    )}
                  >
                    <div
                      aria-hidden
                      className={cn(
                        'type-label hidden items-center gap-x-3 border-b bg-tissue/70 px-5 py-2.5 text-ink-2 xl:grid',
                        COLUMNS,
                      )}
                    >
                      <span>#</span>
                      <span>Player, club</span>
                      <span className="text-right">Age</span>
                      <span className="text-right">Minutes</span>
                      <span>Fit score</span>
                      <span>Pick</span>
                      <span>Save</span>
                      <span className="sr-only">Evidence</span>
                    </div>
                    <ol aria-label={`${role.name} candidates, ranked by fit score`}>
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
                  </div>
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
      </Container>
    </>
  )
}
