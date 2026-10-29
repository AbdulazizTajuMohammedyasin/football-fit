import { ChevronDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import { useClub, useClubNeeds } from '@/api/queries'
import type { PositionNeed, SquadPlayer } from '@/api/types'
import { NeedMap } from '@/components/NeedMap'
import { ArrowLink, Container, PageHeader } from '@/components/page'
import { CoverageBadge, DemoBadge, NeedMeter, PositionChip, ScoreBar } from '@/components/score'
import { SourceLine } from '@/components/SourceLine'
import { EmptyState, ErrorState, LoadingState, PageError, PageLoading } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatAge, formatNumber, formatScore, withArticle } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Score numeral colour per need level, matching the need meter. */
const NEED_TEXT: Record<string, string> = { high: 'text-hot', medium: 'text-amber', low: 'text-cyan' }

/** The component contributing most to a need score (value × weight), named for a one-line summary. */
function biggestFactor(need: PositionNeed) {
  const scored = need.components.filter((component) => component.value !== null)
  if (!scored.length) return null
  return scored.reduce((a, b) => ((b.value ?? 0) * b.weight > (a.value ?? 0) * a.weight ? b : a))
}

function NeedRow({ need, clubSlug, top }: { need: PositionNeed; clubSlug: string; top: boolean }) {
  const factor = biggestFactor(need)
  const [first, ...others] = need.roles
  return (
    <li
      id={`need-${need.position}`}
      className={cn('scroll-mt-24 border-b last:border-b-0', top && 'shadow-[inset_3px_0_0_var(--signal)]')}
    >
      <article aria-labelledby={`need-${need.position}-title`} className="space-y-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2.5">
              <PositionChip code={need.position} />
              <h3 id={`need-${need.position}-title`} className="type-sub">
                {need.label}
              </h3>
            </div>
            <NeedMeter level={need.level} />
          </div>
          <p className="shrink-0 text-right">
            <span className={cn('num block text-6xl leading-none', NEED_TEXT[need.level])}>{formatScore(need.score)}</span>
            <span className="type-label text-ink-2">need, 0–100</span>
          </p>
        </div>

        <p className="text-[15px] text-ink-2">
          {need.squad_count} recognised, typical depth {need.target_depth}.
          {factor && (
            <>
              {' '}
              Biggest factor: <span className="text-ink">{factor.label.toLowerCase()}</span> (
              {Math.round(factor.value ?? 0)}/100).
            </>
          )}
        </p>

        <details className="group rounded-lg border bg-bone/50">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 text-sm text-ink [&::-webkit-details-marker]:hidden">
            Evidence and components
            <ChevronDown className="size-4 text-ink-2 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="space-y-5 border-t px-4 py-4">
            <dl className="grid gap-4 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {need.components.map((component) => (
                <div key={component.key} className="space-y-1.5">
                  <dt className="flex items-baseline justify-between gap-2 text-sm">
                    <span>{component.label}</span>
                    <span className="type-label text-ink-2">weight {Math.round(component.weight * 100)}%</span>
                  </dt>
                  <dd className="flex items-center gap-3">
                    <ScoreBar value={component.value} label={component.label} />
                    <span className="w-9 text-right tabular-nums">
                      {component.value === null ? 'n/a' : Math.round(component.value)}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
            <ul className="space-y-1.5 text-[15px]">
              {need.evidence.map((line) => (
                <li key={line} className="flex gap-2.5">
                  <span className="mt-2.5 size-1 shrink-0 rounded-full bg-ink-2" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </details>

        {first && (
          <div className="flex flex-wrap items-center gap-2">
            <ArrowLink to={`/clubs/${clubSlug}/shortlist?role=${first.key}`}>
              Find {withArticle(first.name.toLowerCase())}
            </ArrowLink>
            {others.map((role) => (
              <Button key={role.key} asChild variant="outline">
                <Link to={`/clubs/${clubSlug}/shortlist?role=${role.key}`}>
                  Find {withArticle(role.name.toLowerCase())}
                </Link>
              </Button>
            ))}
          </div>
        )}
      </article>
    </li>
  )
}

function NeedsPanel({ slug }: { slug: string }) {
  const needs = useClubNeeds(slug)
  if (needs.isPending) return <LoadingState label="Analysing squad needs" />
  if (needs.isError) return <ErrorState error={needs.error} onRetry={() => needs.refetch()} />
  if (!needs.data.needs.length) {
    return <EmptyState title="No needs analysis available">{needs.data.detail}</EmptyState>
  }
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10">
      <div className="max-w-xl space-y-4 lg:sticky lg:top-24 lg:max-w-none lg:self-start">
        <NeedMap needs={needs.data.needs} />
        <p className="text-sm text-ink-2">
          Need scores run from 0 (no need) to 100 (urgent). Each blends quality gap, depth and ageing; missing
          components are left out rather than counted as zero.{' '}
          <Link to="/methodology#needs" className="text-ink underline underline-offset-4">
            How needs are scored
          </Link>
        </p>
      </div>
      <section aria-label="Positions by need" className="min-w-0">
        <p className="type-label mb-3 text-ink-2">Ordered by need score, biggest first</p>
        <ol className="overflow-hidden rounded-xl border bg-paper">
          {needs.data.needs.map((need, index) => (
            <NeedRow key={need.position} need={need} clubSlug={slug} top={index === 0} />
          ))}
        </ol>
      </section>
    </div>
  )
}

function BestRole({ player }: { player: SquadPlayer }) {
  if (!player.best_role) return <span className="text-sm text-ink-2">Not enough data to score</span>
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="num w-10 text-xl">{formatScore(player.best_role.score)}</span>
      <ScoreBar
        value={player.best_role.score}
        label={`${player.name} ${player.best_role.name} score`}
        className="w-20"
      />
      <span className="text-sm text-ink-2">{player.best_role.name}</span>
      {player.best_role.coverage < 0.7 && <CoverageBadge coverage={player.best_role.coverage} />}
    </span>
  )
}

function SquadTable({ squad }: { squad: SquadPlayer[] }) {
  const [position, setPosition] = useState('all')
  const positions = useMemo(() => [...new Set(squad.map((player) => player.position))], [squad])
  const shown = position === 'all' ? squad : squad.filter((player) => player.position === position)

  if (!squad.length) return <EmptyState title="No squad data recorded for this season" />
  return (
    <div className="space-y-4">
      <div
        role="group"
        aria-label="Filter squad by position"
        className="inline-flex flex-wrap gap-0.5 rounded-full border bg-paper p-1"
      >
        {['all', ...positions].map((code) => (
          <button
            key={code}
            type="button"
            aria-pressed={position === code}
            onClick={() => setPosition(code)}
            className={cn(
              'h-9 min-w-11 cursor-pointer rounded-full px-3.5 font-mono text-[13px] transition-colors',
              position === code ? 'bg-signal text-on-ink' : 'text-ink-2 hover:bg-tissue hover:text-ink',
            )}
          >
            {code === 'all' ? `All ${squad.length}` : code}
          </button>
        ))}
      </div>

      <ul className="divide-y overflow-hidden rounded-xl border bg-paper sm:hidden" aria-label="Squad">
        {shown.map((player) => (
          <li key={player.slug} className="flex items-center gap-3 px-4 py-3">
            <PositionChip code={player.position} title={player.position_label} />
            <div className="min-w-0 flex-1">
              <Link to={`/players/${player.slug}`} className="block truncate font-medium hover:underline">
                {player.name}
              </Link>
              <p className="text-sm text-ink-2">
                Age {formatAge(player.age)}, {formatNumber(player.minutes)} min
                {player.best_role && <>, best as {player.best_role.name.toLowerCase()}</>}
              </p>
            </div>
            {player.best_role ? (
              <span className="text-right">
                <span className="num block text-2xl leading-none">{formatScore(player.best_role.score)}</span>
                {player.best_role.coverage < 0.7 && <span className="text-xs text-caution">Incomplete data</span>}
              </span>
            ) : (
              <span className="max-w-20 text-right text-xs leading-tight text-ink-2">Not enough data to score</span>
            )}
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden rounded-xl border bg-paper sm:block" data-scroll-x>
        <Table className="min-w-[40rem]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Player</TableHead>
              <TableHead>Pos.</TableHead>
              <TableHead className="text-right">Age</TableHead>
              <TableHead className="text-right">Minutes</TableHead>
              <TableHead className="w-[40%] pr-5">Best role score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((player) => (
              <TableRow key={player.slug}>
                <TableCell className="pl-5">
                  <Link to={`/players/${player.slug}`} className="font-medium hover:underline">
                    {player.name}
                  </Link>
                  {player.secondary_positions.length > 0 && (
                    <span className="ml-2 text-sm text-ink-2">also {player.secondary_positions.join(', ')}</span>
                  )}
                </TableCell>
                <TableCell>
                  <PositionChip code={player.position} title={player.position_label} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatAge(player.age)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(player.minutes)}</TableCell>
                <TableCell className="pr-5">
                  <BestRole player={player} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export function ClubPage() {
  const { slug = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const club = useClub(slug)
  const tab = searchParams.get('tab') === 'squad' ? 'squad' : 'needs'

  if (club.isPending) return <PageLoading label="Loading club" band />
  if (club.isError) return <PageError error={club.error} onRetry={() => club.refetch()} title="Could not load club" />

  const { data } = club
  const tabs = [
    { key: 'needs', label: 'Squad needs' },
    { key: 'squad', label: `Squad (${data.squad.length})` },
  ] as const

  return (
    <>
      <PageHeader
        band
        back={{ to: '/', label: 'All clubs' }}
        context={
          <span className="flex items-center gap-2.5">
            {data.club.short_name.length <= 4 && <span className="text-signal">{data.club.short_name}</span>}
            {data.club.is_demo && <DemoBadge />}
          </span>
        }
        title={data.club.name}
        meta={<SourceLine meta={data} className="text-ink-2" />}
      />

      <Container className="py-6 sm:py-8">
        <Tabs
          value={tab}
          onValueChange={(value) => setSearchParams(value === 'squad' ? { tab: 'squad' } : {}, { replace: true })}
        >
          <TabsList className="mb-6 h-auto gap-0.5 rounded-full border bg-paper p-1 group-data-[orientation=horizontal]/tabs:h-auto">
            {tabs.map((item) => (
              <TabsTrigger
                key={item.key}
                value={item.key}
                className="h-10 flex-none cursor-pointer rounded-full px-4 text-[15px] font-normal text-ink-2 hover:bg-tissue hover:text-ink data-[state=active]:bg-signal data-[state=active]:text-on-ink data-[state=active]:shadow-none"
              >
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="needs">
            <NeedsPanel slug={slug} />
          </TabsContent>
          <TabsContent value="squad">
            <SquadTable squad={data.squad} />
          </TabsContent>
        </Tabs>
      </Container>
    </>
  )
}
