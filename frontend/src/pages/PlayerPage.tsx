import { AlertTriangle, GitCompareArrows } from 'lucide-react'
import { Link, useParams } from 'react-router'

import { useMeta, usePlayer } from '@/api/queries'
import type { RoleScore } from '@/api/types'
import { MetricRow } from '@/components/MetricRow'
import { CoverageBadge, ScoreBar } from '@/components/score'
import { SourceLine } from '@/components/SourceLine'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatAge, formatNumber, formatPercent, formatScore, NOT_RECORDED } from '@/lib/format'

function RoleScoreCard({ score, units }: { score: RoleScore; units: Map<string, 'per90' | 'pct'> }) {
  return (
    <article className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{score.role_name}</h3>
          <CoverageBadge coverage={score.coverage} />
        </div>
        <span className="text-2xl font-semibold tabular-nums">{formatScore(score.score)}</span>
      </div>
      <ScoreBar value={score.score} label={`${score.role_name} role score`} />
      <div className="space-y-2">
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

  if (player.isPending) return <LoadingState label="Loading player" />
  if (player.isError) {
    return <ErrorState error={player.error} onRetry={() => player.refetch()} title="Could not load player" />
  }

  const { data } = player
  const info = data.player
  const units = new Map((meta.data?.metrics ?? []).map((metric) => [metric.key, metric.unit]))
  const missingCount = data.metrics.filter((metric) => metric.missing).length
  const poolSize = Math.max(0, ...data.metrics.map((metric) => metric.pool_size))
  const minMinutes = meta.data?.scoring.benchmark_min_minutes ?? 900

  const facts: [string, string][] = [
    ['Club', info.club?.name ?? 'No club'],
    ['Age', formatAge(info.age)],
    ['Nationality', info.nationality ?? NOT_RECORDED],
    ['Preferred foot', info.preferred_foot ?? NOT_RECORDED],
    ['League minutes', formatNumber(info.minutes)],
    ['Appearances', formatNumber(info.appearances)],
  ]

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        {info.club && (
          <Link to={`/clubs/${info.club.slug}?tab=squad`} className="text-sm text-muted-foreground hover:underline">
            ← {info.club.name} squad
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">{info.name}</h1>
          <Badge variant="secondary">{info.position_label}</Badge>
          {info.secondary_positions?.map((position) => (
            <Badge key={position} variant="outline">
              also {position}
            </Badge>
          ))}
          {info.club?.is_demo && <Badge variant="outline">Demo</Badge>}
        </div>
        <SourceLine meta={data} />
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg border bg-card p-4 sm:grid-cols-3 lg:grid-cols-6">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        <Button asChild variant="outline" size="sm">
          <Link to={`/compare?players=${info.slug}`}>
            <GitCompareArrows aria-hidden /> Compare with other players
          </Link>
        </Button>
      </header>

      {data.season === null ? (
        <EmptyState title="No season statistics recorded">{data.detail}</EmptyState>
      ) : (
        <>
          {(data.below_benchmark_minutes || missingCount > 0) && (
            <Alert className="border-amber-300 bg-warning text-warning-foreground">
              <AlertTriangle />
              <AlertTitle>Read this evidence with care</AlertTitle>
              <AlertDescription className="text-warning-foreground">
                <ul className="list-disc pl-4">
                  {data.below_benchmark_minutes && (
                    <li>
                      Fewer than {minMinutes} league minutes: rates per 90 are based on a small sample.
                    </li>
                  )}
                  {missingCount > 0 && (
                    <li>
                      {missingCount} of {data.metrics.length} relevant metrics are not recorded (data coverage{' '}
                      {formatPercent(data.data_coverage ?? 0)}). Missing metrics are left out of scores, not counted
                      as zero.
                    </li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <section aria-labelledby="roles-heading" className="space-y-3">
            <h2 id="roles-heading" className="text-xl font-semibold">
              Role scores
            </h2>
            <p className="text-sm text-muted-foreground">
              Percentiles compare this player with {info.position_label.toLowerCase()}s who played {minMinutes}+
              minutes in the same competition and season (up to {poolSize} players per metric).
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
              {data.role_scores.map((score) => (
                <RoleScoreCard key={score.role} score={score} units={units} />
              ))}
            </div>
          </section>

          <section aria-labelledby="metrics-heading" className="space-y-3">
            <h2 id="metrics-heading" className="text-xl font-semibold">
              All recorded metrics
            </h2>
            <div className="space-y-2 rounded-lg border bg-card p-4">
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
          </section>
        </>
      )}
    </div>
  )
}
