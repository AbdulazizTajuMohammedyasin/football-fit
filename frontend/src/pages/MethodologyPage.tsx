import type { ReactNode } from 'react'

import { useMeta } from '@/api/queries'
import { ErrorState, LoadingState } from '@/components/states'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatPercent } from '@/lib/format'

const FIT_LABELS: Record<string, string> = {
  role_quality: 'Role quality — weighted percentile across the role profile',
  upgrade: "Upgrade on squad — 50 + (candidate's role score − club's best current player), capped 0–100",
  reliability: 'Sample reliability — league minutes relative to a full season',
}

const NEED_LABELS: Record<string, string> = {
  quality_gap: "Quality gap — how far the club's best established player ranks from the top of the league",
  depth_gap: 'Depth gap — recognised players (cover players count half) against typical depth',
  ageing: 'Ageing — share of the position’s minutes played by older players',
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="text-xl font-semibold">
        {title}
      </h2>
      {children}
    </section>
  )
}

function WeightList({ weights, labels }: { weights: Record<string, number>; labels: Record<string, string> }) {
  return (
    <ul className="divide-y rounded-lg border bg-card">
      {Object.entries(weights).map(([key, weight]) => (
        <li key={key} className="flex items-start justify-between gap-4 px-4 py-2 text-sm">
          <span>{labels[key] ?? key}</span>
          <span className="font-semibold tabular-nums">{formatPercent(weight)}</span>
        </li>
      ))}
    </ul>
  )
}

export function MethodologyPage() {
  const meta = useMeta()
  if (meta.isPending) return <LoadingState label="Loading methodology" />
  if (meta.isError) return <ErrorState error={meta.error} onRetry={() => meta.refetch()} />

  const { scoring, roles, positions, metrics, sources } = meta.data

  return (
    <article className="max-w-4xl space-y-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">How scoring works</h1>
        <p className="text-lg text-muted-foreground">
          Every number in Football Fit comes from recorded statistics and fixed, published rules. The same inputs
          always give the same result. A fit score ranks candidates for a role; it is not a probability that a
          transfer will work.
        </p>
      </header>

      <Section id="sources" title="Data sources">
        {sources.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data has been loaded yet.</p>
        ) : (
          <ul className="space-y-3">
            {sources.map((source) => (
              <li key={source.slug} className="space-y-1 rounded-lg border bg-card p-4 text-sm">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {source.name}
                  {source.is_demo && <Badge variant="outline">Demo — fictional</Badge>}
                </p>
                <p className="text-muted-foreground">Data as of {formatDate(source.as_of)}</p>
                {source.licence && <p>Licence / terms: {source.licence}</p>}
                {source.notes && <p className="text-muted-foreground">{source.notes}</p>}
                {source.url && (
                  <a href={source.url} className="text-primary hover:underline" rel="noreferrer" target="_blank">
                    Source website
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="missing" title="Missing data">
        <p>
          A statistic that was not recorded is shown as “Not recorded” and left out of every calculation — it is
          never treated as zero. Instead, each role score reports its <strong>coverage</strong>: the share of the
          role profile's weight that has data. Scores with less than{' '}
          {formatPercent(scoring.reliable_coverage)} coverage are flagged as incomplete and are hidden from
          shortlists unless you choose to include them.
        </p>
      </Section>

      <Section id="role-score" title="Role scores">
        <p>
          Each metric is turned into a percentile (0–100) against players in the same position and competition
          who played at least {scoring.benchmark_min_minutes} league minutes — or, early in a season,{' '}
          {formatPercent(scoring.benchmark_share_of_max)} of the most minutes anyone has played so far, if that is
          lower. For metrics where lower is better —
          such as being dribbled past — the scale is flipped so 100 is always best. The role score is the weighted
          average of the available percentiles using the role profile's weights below.
        </p>
      </Section>

      <Section id="fit-score" title="Fit score">
        <p>
          Shortlists rank players by a fit score that combines three components. When a component has no data
          (for example, minutes were not recorded) it is left out and the remaining weights are rescaled.
          Reliability reaches 100 at {scoring.full_reliability_minutes} minutes (or{' '}
          {formatPercent(scoring.reliability_share_of_max)} of the most minutes played so far, early in a season).
        </p>
        <WeightList weights={scoring.fit_weights} labels={FIT_LABELS} />
      </Section>

      <Section id="needs" title="Club needs">
        <p>
          Each position gets a need score from 0 (no need) to 100 (urgent), blended from the components below.
          “Older players” means aged {scoring.ageing_threshold} or more on the data date. Scores of{' '}
          {scoring.need_levels.high}+ are shown as a high need and {scoring.need_levels.medium}+ as a medium need.
        </p>
        <WeightList weights={scoring.need_weights} labels={NEED_LABELS} />
        <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          {positions.map((position) => (
            <li key={position.code} className="rounded-md border bg-card px-3 py-2">
              <span className="font-medium">{position.label}</span>
              <span className="block text-xs text-muted-foreground">Typical depth {position.target_depth}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="roles" title="Role profiles">
        <p>Positions are judged on different metrics. These are the exact weights used.</p>
        <div className="grid gap-4 md:grid-cols-2">
          {roles.map((role) => (
            <div key={role.key} className="space-y-2 rounded-lg border bg-card p-4">
              <div>
                <p className="font-semibold">{role.name}</p>
                <p className="text-xs text-muted-foreground">
                  {positions.find((p) => p.code === role.position)?.label} · {role.summary}
                </p>
              </div>
              <ul className="space-y-0.5 text-sm">
                {role.weights.map((weight) => (
                  <li key={weight.metric} className="flex justify-between gap-2">
                    <span>{weight.label}</span>
                    <span className="tabular-nums">{formatPercent(weight.weight)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section id="glossary" title="Metric glossary">
        <dl className="divide-y rounded-lg border bg-card">
          {metrics.map((metric) => (
            <div key={metric.key} className="grid gap-1 px-4 py-2 text-sm sm:grid-cols-[14rem_1fr]">
              <dt className="font-medium">{metric.label}</dt>
              <dd className="text-muted-foreground">{metric.description}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </article>
  )
}
