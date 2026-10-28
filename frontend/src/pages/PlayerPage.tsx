import { AlertTriangle } from 'lucide-react'
import { useParams } from 'react-router'

import { useMeta, usePlayer } from '@/api/queries'
import type { RoleScore } from '@/api/types'
import { MetricRow } from '@/components/MetricRow'
import { ArrowLink, Container, PageHeader, SectionHeading } from '@/components/page'
import { CoverageBadge, DemoBadge, PositionChip, ScoreBar, Tag } from '@/components/score'
import { SaveToShortlist } from '@/components/SaveToShortlist'
import { SourceLine } from '@/components/SourceLine'
import { EmptyState, PageError, PageLoading } from '@/components/states'
import { formatAge, formatNumber, formatPercent, formatScore } from '@/lib/format'
import { cn } from '@/lib/utils'

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
    <article className={cn('space-y-4 rounded-xl border bg-paper p-5', best && 'shadow-[inset_3px_0_0_var(--signal)]')}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <h3 className="type-sub">{score.role_name}</h3>
          <div className="flex flex-wrap gap-1.5">
            {best && <Tag tone="signal">Highest role score</Tag>}
            <CoverageBadge coverage={score.coverage} />
          </div>
        </div>
        {score.score === null ? (
          <span className="max-w-24 text-right text-sm text-ink-2">Not enough data to score</span>
        ) : (
          <span className="text-5xl leading-none tracking-tight tabular-nums">{formatScore(score.score)}</span>
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
  // Metrics already shown inside a role card are not repeated in the list below.
  const inRoleCards = new Set(data.role_scores.flatMap((score) => score.components.map((c) => c.metric)))
  const otherMetrics = data.metrics.filter((metric) => !inRoleCards.has(metric.key))

  const facts: [string, string | null][] = [
    ['Club', info.club?.name ?? 'No club'],
    ['Age', info.age === null ? null : formatAge(info.age)],
    ['League minutes', info.minutes === null ? null : formatNumber(info.minutes)],
    ['Appearances', info.appearances === null ? null : formatNumber(info.appearances)],
    ['Nationality', info.nationality],
    ['Preferred foot', info.preferred_foot],
  ]
  const recorded = facts.filter(([, value]) => value !== null)
  const notRecorded = facts.filter(([, value]) => value === null).map(([label]) => label.toLowerCase())

  return (
    <>
      <PageHeader
        band
        back={info.club ? { to: `/clubs/${info.club.slug}?tab=squad`, label: `${info.club.name} squad` } : undefined}
        context={
          <span className="flex flex-wrap items-center gap-2">
            <PositionChip code={info.position} className="border-on-ink-2/50 text-on-ink" />
            <span>{info.position_label}</span>
            {info.secondary_positions?.map((position) => (
              <span key={position} className="text-on-ink-2">
                also {position}
              </span>
            ))}
            {info.club?.is_demo && <DemoBadge />}
          </span>
        }
        title={info.name}
        meta={<SourceLine meta={data} className="text-on-ink-2" />}
        aside={
          <div className="flex flex-wrap items-center gap-2">
            <ArrowLink to={`/compare?players=${info.slug}`} onDark>
              Compare with other players
            </ArrowLink>
            <SaveToShortlist
              playerSlug={info.slug}
              playerName={info.name}
              className="h-10 border border-line-on-ink text-on-ink hover:bg-white/10 hover:text-on-ink"
            />
          </div>
        }
      />

      <div className="border-b bg-paper">
        <Container className="py-4">
          <dl className="flex flex-wrap gap-x-10 gap-y-3">
            {recorded.map(([label, value]) => (
              <div key={label}>
                <dt className="type-label text-ink-2">{label}</dt>
                <dd className="text-lg tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          {notRecorded.length > 0 && (
            <p className="mt-2 text-sm text-ink-2">Not recorded by this source: {notRecorded.join(', ')}.</p>
          )}
        </Container>
      </div>

      <Container className="space-y-12 py-8 sm:py-10">
        {data.season === null ? (
          <EmptyState title="No season statistics recorded">{data.detail}</EmptyState>
        ) : (
          <>
            {(data.below_benchmark_minutes || missingCount > 0) && (
              <div role="note" className="flex gap-3 rounded-xl border border-caution/30 bg-caution-bg p-4 text-caution">
                <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
                <div className="space-y-1">
                  <p className="font-medium">Read this evidence with care</p>
                  <ul className="list-disc space-y-0.5 pl-4 text-[15px]">
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

            {otherMetrics.length > 0 && (
              <section aria-labelledby="metrics-heading" className="space-y-5">
                <SectionHeading
                  id="metrics-heading"
                  title="Other recorded metrics"
                  description="Metrics not used by this player's role profiles: value per 90 minutes (or a percentage), then the percentile against the same peer group."
                />
                <div className="rounded-xl border bg-paper">
                  <div className="type-label hidden grid-cols-[minmax(0,14rem)_6rem_minmax(0,1fr)_3rem] gap-x-3 border-b bg-tissue/70 px-5 py-2.5 text-ink-2 sm:grid">
                    <span>Metric</span>
                    <span className="text-right">Value</span>
                    <span>Percentile, 0–100</span>
                    <span className="text-right">Rank</span>
                  </div>
                  <div className="space-y-3 p-5">
                    {otherMetrics.map((metric) => (
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
            )}
          </>
        )}
      </Container>
    </>
  )
}
