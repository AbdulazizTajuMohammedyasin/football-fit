import { AlertTriangle, GitCompareArrows } from 'lucide-react'
import { Link, useParams } from 'react-router'

import { useMeta, usePlayer } from '@/api/queries'
import type { RoleScore } from '@/api/types'
import { MetricRow } from '@/components/MetricRow'
import { PageBody, PageHeader, SectionHeading } from '@/components/page'
import { CoverageBadge, DemoBadge, PositionChip, ScoreBar } from '@/components/score'
import { SaveToShortlist } from '@/components/SaveToShortlist'
import { SourceLine } from '@/components/SourceLine'
import { EmptyState, PageError, PageLoading } from '@/components/states'
import { Button } from '@/components/ui/button'
import { formatAge, formatNumber, formatPercent, formatScore, NOT_RECORDED } from '@/lib/format'
import { cn } from '@/lib/utils'

const ON_DARK = 'border border-white/25 bg-transparent text-pitch-foreground hover:bg-white/10 hover:text-pitch-foreground'

function RoleScoreCard({
  score,
  units,
  best,
}: {
  score: RoleScore
  units: Map<string, 'per90' | 'pct'>
  best: boolean
}) {
  return (
    <article className={cn('space-y-4 rounded-lg border bg-card p-5', best && 'border-primary ring-1 ring-primary')}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <h3 className="font-display text-2xl leading-tight font-semibold">{score.role_name}</h3>
          <div className="flex flex-wrap gap-1.5">
            {best && (
              <span className="rounded-sm bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                Highest role score
              </span>
            )}
            <CoverageBadge coverage={score.coverage} />
          </div>
        </div>
        {score.score === null ? (
          <span className="max-w-24 text-right text-sm text-muted-foreground">Not enough data to score</span>
        ) : (
          <span className="font-display text-5xl leading-none font-bold tabular-nums">{formatScore(score.score)}</span>
        )}
      </div>
      <ScoreBar value={score.score} label={`${score.role_name} role score`} />
      <div className="space-y-2.5 border-t pt-4">
        {score.components.map((component) => (
          <MetricRow
            key={component.metric}
            label={component.label}
            value={component.value}
            unit={units.get(component.metric) ?? 'per90'}
            percentile={component.percentile}
            higherIsBetter={component.higher_is_better}
            weight={component.weight}
          />
        ))}
      </div>
    </article>
  )
}

export function PlayerPage() {
  const { slug = '' } = useParams()
  const player = usePlayer(slug)
  const meta = useMeta()

  if (player.isPending) return <PageLoading label="Loading player" band />
  if (player.isError) {
    return <PageError error={player.error} onRetry={() => player.refetch()} title="Could not load player" />
  }

  const { data } = player
  const info = data.player
  const units = new Map((meta.data?.metrics ?? []).map((metric) => [metric.key, metric.unit]))
  const missingCount = data.metrics.filter((metric) => metric.missing).length
  const poolSize = Math.max(0, ...data.metrics.map((metric) => metric.pool_size))
  const minMinutes = data.thresholds?.benchmark_min_minutes ?? meta.data?.scoring.benchmark_min_minutes ?? 900
  const scored = data.role_scores.filter((score) => score.score !== null)
  const bestRole = scored.length > 1 ? scored.reduce((a, b) => ((b.score ?? 0) > (a.score ?? 0) ? b : a)).role : null

  const facts: [string, string][] = [
    ['Club', info.club?.name ?? 'No club'],
    ['Age', formatAge(info.age)],
    ['Nationality', info.nationality ?? NOT_RECORDED],
    ['Preferred foot', info.preferred_foot ?? NOT_RECORDED],
    ['League minutes', formatNumber(info.minutes)],
    ['Appearances', formatNumber(info.appearances)],
  ]

  return (
    <>
      <PageHeader
        band
        back={info.club ? { to: `/clubs/${info.club.slug}?tab=squad`, label: `${info.club.name} squad` } : undefined}
        context={
          <span className="flex flex-wrap items-center gap-2">
            <PositionChip code={info.position} className="bg-floodlight text-pitch" />
            <span>{info.position_label}</span>
            {info.secondary_positions?.map((position) => (
              <span key={position} className="rounded-sm border border-white/25 px-1.5 text-xs">
                also {position}
              </span>
            ))}
            {info.club?.is_demo && <DemoBadge />}
          </span>
        }
        title={info.name}
        meta={<SourceLine meta={data} className="text-pitch-muted" />}
        actions={
          <>
            <Button asChild size="sm" className="bg-floodlight text-pitch hover:bg-floodlight/90">
              <Link to={`/compare?players=${info.slug}`}>
                <GitCompareArrows aria-hidden /> Compare with other players
              </Link>
            </Button>
            <SaveToShortlist playerSlug={info.slug} playerName={info.name} className={ON_DARK} />
          </>
        }
      >
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-white/15 pt-5 sm:grid-cols-3 lg:grid-cols-6">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-pitch-muted">{label}</dt>
              <dd
                className={cn(
                  'font-display text-xl font-semibold',
                  value === NOT_RECORDED && 'font-sans text-sm font-normal text-pitch-muted italic',
                )}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </PageHeader>

      <PageBody className="space-y-12">
        {data.season === null ? (
          <EmptyState title="No season statistics recorded">{data.detail}</EmptyState>
        ) : (
          <>
            {(data.below_benchmark_minutes || missingCount > 0) && (
              <div
                role="note"
                className="flex gap-3 rounded-md border border-need-medium/30 border-l-4 border-l-need-medium bg-warning p-4 text-warning-foreground"
              >
                <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
                <div className="space-y-1">
                  <p className="font-semibold">Read this evidence with care</p>
                  <ul className="list-disc space-y-0.5 pl-4 text-sm">
                    {data.below_benchmark_minutes && (
                      <li>Fewer than {minMinutes} league minutes: rates per 90 are based on a small sample.</li>
                    )}
                    {missingCount > 0 && (
                      <li>
                        {missingCount} of {data.metrics.length} relevant metrics are not recorded (data coverage{' '}
                        {formatPercent(data.data_coverage ?? 0)}). Missing metrics are left out of scores, not
                        counted as zero.
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            <section aria-labelledby="roles-heading" className="space-y-5">
              <SectionHeading
                id="roles-heading"
                title="Role scores"
                description={
                  <>
                    Percentiles compare this player with {info.position_label.toLowerCase()}s who played {minMinutes}+
                    minutes in the same competition and season (up to {poolSize} players per metric).
                  </>
                }
              />
              <div className="grid gap-4 lg:grid-cols-2">
                {data.role_scores.map((score) => (
                  <RoleScoreCard key={score.role} score={score} units={units} best={score.role === bestRole} />
                ))}
              </div>
            </section>

            <section aria-labelledby="metrics-heading" className="space-y-5">
              <SectionHeading
                id="metrics-heading"
                title="All recorded metrics"
                description="Value per 90 minutes (or as a percentage), then the percentile against the same peer group."
              />
              <div className="rounded-lg border bg-card">
                <div className="hidden grid-cols-[minmax(0,14rem)_6rem_minmax(0,1fr)_3rem] gap-x-3 border-b px-5 py-2.5 text-xs font-semibold text-muted-foreground sm:grid">
                  <span>Metric</span>
                  <span className="text-right">Value</span>
                  <span>Percentile, 0–100</span>
                  <span className="text-right">Rank</span>
                </div>
                <div className="space-y-3 p-5">
                  {data.metrics.map((metric) => (
                    <MetricRow
                      key={metric.key}
                      label={metric.label}
                      value={metric.value}
                      unit={metric.unit}
                      percentile={metric.percentile}
                      higherIsBetter={metric.higher_is_better}
                    />
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </PageBody>
    </>
  )
}
