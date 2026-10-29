import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

import { useMeta } from '@/api/queries'
import { PageBody, PageHeader } from '@/components/page'
import { PositionChip, Tag } from '@/components/score'
import { PageError, PageLoading } from '@/components/states'
import { formatDate, formatPercent } from '@/lib/format'

const CONTENTS = [
  ['sources', 'Data sources'],
  ['missing', 'Missing data'],
  ['role-score', 'Role scores'],
  ['fit-score', 'Fit score'],
  ['needs', 'Club needs'],
  ['roles', 'Role profiles'],
  ['glossary', 'Metric glossary'],
] as const

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
  const number = CONTENTS.findIndex(([key]) => key === id) + 1
  return (
    <section
      aria-labelledby={`${id}-heading`}
      id={id}
      className="scroll-mt-24 space-y-4 border-t pt-10 first:border-0 first:pt-0"
    >
      <div className="space-y-2">
        <span className="type-label inline-block rounded-full border border-signal/40 bg-signal/10 px-2.5 py-0.5 text-signal">
          {String(number).padStart(2, '0')}
        </span>
        <h2 id={`${id}-heading`} className="type-section">
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

function WeightList({ weights, labels }: { weights: Record<string, number>; labels: Record<string, string> }) {
  return (
    <ul className="divide-y rounded-xl border bg-paper">
      {Object.entries(weights).map(([key, weight]) => (
        <li key={key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 text-[15px]">
          <span>{labels[key] ?? key}</span>
          <span className="num text-3xl text-signal">{formatPercent(weight)}</span>
          <span className="col-span-2 block h-1 overflow-hidden rounded-full bg-tissue" aria-hidden>
            <span className="block h-full bg-signal" style={{ width: `${weight * 100}%` }} />
          </span>
        </li>
      ))}
    </ul>
  )
}

function ContentsList() {
  return (
    <ul className="space-y-1 text-[15px]">
      {CONTENTS.map(([id, label], index) => (
        <li key={id}>
          <a href={`#${id}`} className="flex gap-3 rounded-md py-1.5 text-ink-2 hover:text-ink">
            <span className="type-label pt-0.5">{String(index + 1).padStart(2, '0')}</span>
            {label}
          </a>
        </li>
      ))}
    </ul>
  )
}

export function MethodologyPage() {
  const meta = useMeta()
  if (meta.isPending) return <PageLoading label="Loading methodology" />
  if (meta.isError) return <PageError error={meta.error} onRetry={() => meta.refetch()} />

  const { scoring, roles, positions, metrics, sources } = meta.data
  const positionsWithRoles = positions.filter((position) => roles.some((role) => role.position === position.code))

  return (
    <>
      <PageHeader
        title="How scoring works"
        meta={
          <p className="max-w-2xl text-lg">
            Every number in Football Fit comes from recorded statistics and fixed, published rules. The same inputs
            always give the same result. A fit score ranks candidates for a role; it is not a probability that a
            transfer will work.
          </p>
        }
      />
      <PageBody className="grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16">
        <details className="group rounded-xl border bg-paper lg:hidden">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 [&::-webkit-details-marker]:hidden">
            On this page
            <ChevronDown className="size-4 text-ink-2 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <nav aria-label="On this page" className="border-t px-4 py-2">
            <ContentsList />
          </nav>
        </details>
        <nav aria-label="On this page" className="hidden lg:block">
          <div className="sticky top-24 space-y-3">
            <p className="type-label text-ink-2">On this page</p>
            <ContentsList />
          </div>
        </nav>

        <article className="max-w-3xl min-w-0 space-y-10 text-[17px] leading-relaxed">
          <Section id="sources" title="Data sources">
            {sources.length === 0 ? (
              <p className="text-ink-2">No data has been loaded yet.</p>
            ) : (
              <ul className="space-y-3">
                {sources.map((source) => (
                  <li key={source.slug} className="space-y-2 rounded-xl border bg-paper p-5 text-[15px]">
                    <p className="flex flex-wrap items-center gap-2.5">
                      <span className="type-sub">{source.name}</span>
                      {source.is_demo ? <Tag tone="caution">Demo — fictional</Tag> : <Tag tone="signal">Real data</Tag>}
                    </p>
                    <p className="type-label text-ink-2">Data as of {formatDate(source.as_of)}</p>
                    {source.licence && <p>Licence / terms: {source.licence}</p>}
                    {source.notes && <p className="text-ink-2">{source.notes}</p>}
                    {source.url && (
                      <a
                        href={source.url}
                        className="inline-block underline underline-offset-4"
                        rel="noreferrer"
                        target="_blank"
                      >
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
              never treated as zero. Instead, each role score reports its <strong className="font-medium">coverage</strong>:
              the share of the role profile's weight that has data. Scores with less than{' '}
              {formatPercent(scoring.reliable_coverage)} coverage are flagged as incomplete and are hidden from
              shortlists unless you choose to include them.
            </p>
          </Section>

          <Section id="role-score" title="Role scores">
            <p>
              Each metric is turned into a percentile (0–100) against players in the same position and competition
              who played at least {scoring.benchmark_min_minutes} league minutes — or, early in a season,{' '}
              {formatPercent(scoring.benchmark_share_of_max)} of the most minutes anyone has played so far, if that
              is lower. For metrics where lower is better — such as being dribbled past — the scale is flipped so 100
              is always best. The role score is the weighted average of the available percentiles using the role
              profile's weights below.
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
            <ul className="grid grid-cols-1 gap-2 text-[15px] min-[420px]:grid-cols-2 sm:grid-cols-3">
              {positions.map((position) => (
                <li key={position.code} className="flex items-center gap-3 rounded-lg border bg-paper px-3 py-2.5">
                  <PositionChip code={position.code} />
                  <span>
                    <span className="block">{position.label}</span>
                    <span className="type-label text-ink-2">Typical depth {position.target_depth}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="roles" title="Role profiles">
            <p>Positions are judged on different metrics. These are the exact weights used.</p>
            <div className="space-y-6">
              {positionsWithRoles.map((position) => (
                <div key={position.code} className="overflow-hidden rounded-xl border bg-paper">
                  <h3 className="flex items-center gap-2.5 border-b bg-tissue/60 px-4 py-2.5 text-[15px]">
                    <PositionChip code={position.code} />
                    {position.label}
                  </h3>
                  <ul className="divide-y">
                    {roles
                      .filter((role) => role.position === position.code)
                      .map((role) => (
                        <li key={role.key} className="space-y-2 px-4 py-3.5">
                          <p>
                            <span className="text-[17px]">{role.name}</span>
                            <span className="block text-sm text-ink-2">{role.summary}</span>
                          </p>
                          <ul className="flex flex-wrap gap-1.5">
                            {role.weights.map((weight) => (
                              <li
                                key={weight.metric}
                                className="inline-flex items-baseline gap-1.5 rounded-lg border px-2 py-0.5 text-sm"
                              >
                                {weight.label}
                                <span className="font-mono text-xs text-ink-2">{formatPercent(weight.weight)}</span>
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          </Section>

          <Section id="glossary" title="Metric glossary">
            <dl className="divide-y rounded-xl border bg-paper">
              {metrics.map((metric) => (
                <div key={metric.key} className="grid gap-1 px-4 py-3 text-[15px] sm:grid-cols-[14rem_1fr]">
                  <dt>{metric.label}</dt>
                  <dd className="text-ink-2">{metric.description}</dd>
                </div>
              ))}
            </dl>
          </Section>
        </article>
      </PageBody>
    </>
  )
}
