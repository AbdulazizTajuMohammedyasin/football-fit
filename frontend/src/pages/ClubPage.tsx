import { ArrowRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import { useClub, useClubNeeds } from '@/api/queries'
import type { PositionNeed, SquadPlayer } from '@/api/types'
import { NeedMap } from '@/components/NeedMap'
import { PageBody, PageHeader } from '@/components/page'
import { CoverageBadge, DemoBadge, NeedBadge, PositionChip, ScoreBar } from '@/components/score'
import { SourceLine } from '@/components/SourceLine'
import { EmptyState, ErrorState, LoadingState, PageError, PageLoading } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatAge, formatNumber, formatScore, withArticle } from '@/lib/format'
import { cn } from '@/lib/utils'

function NeedDetail({ need, clubSlug }: { need: PositionNeed; clubSlug: string }) {
  return (
    <article
      id={`need-${need.position}`}
      aria-labelledby={`need-${need.position}-title`}
      className={cn(
        'scroll-mt-24 overflow-hidden rounded-lg border border-l-4 bg-card',
        need.level === 'high' && 'border-l-need-high',
        need.level === 'medium' && 'border-l-need-medium',
        need.level === 'low' && 'border-l-need-low',
      )}
    >
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
        <div className="flex items-start justify-between gap-4 lg:flex-col lg:justify-start">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <PositionChip code={need.position} />
              <h3 id={`need-${need.position}-title`} className="font-display text-2xl font-semibold">
                {need.label}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {need.squad_count} recognised, typical depth {need.target_depth}
            </p>
            <NeedBadge level={need.level} />
          </div>
          <p className="text-right lg:text-left">
            <span className="block font-display text-5xl leading-none font-bold tabular-nums">
              {formatScore(need.score)}
            </span>
            <span className="text-xs text-muted-foreground">need score, 0–100</span>
          </p>
        </div>

        <div className="min-w-0 space-y-5">
          <dl className="grid gap-4 sm:grid-cols-3">
            {need.components.map((component) => (
              <div key={component.key} className="space-y-1.5">
                <dt className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium">{component.label}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    weight {Math.round(component.weight * 100)}%
                  </span>
                </dt>
                <dd className="flex items-center gap-2">
                  <ScoreBar value={component.value} label={component.label} invert />
                  <span className="w-8 text-right font-display text-lg font-semibold tabular-nums">
                    {component.value === null ? 'n/a' : Math.round(component.value)}
                  </span>
                </dd>
              </div>
            ))}
          </dl>

          <div>
            <h4 className="sr-only">Evidence</h4>
            <ul className="space-y-1.5 text-sm">
              {need.evidence.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-2">
            {need.roles.map((role) => (
              <Button key={role.key} asChild variant={need.level === 'high' ? 'default' : 'outline'} size="sm">
                <Link to={`/clubs/${clubSlug}/shortlist?role=${role.key}`}>
                  Find {withArticle(role.name.toLowerCase())} <ArrowRight aria-hidden />
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </article>
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
    <div className="space-y-4">
      <p className="max-w-3xl text-sm text-muted-foreground">
        Positions are ordered by need score (0–100, higher means a bigger need). Each score blends the
        components shown; missing components are left out rather than counted as zero.
      </p>
      {needs.data.needs.map((need) => (
        <NeedDetail key={need.position} need={need} clubSlug={slug} />
      ))}
    </div>
  )
}

/** The pitch in the header band; quiet placeholders while loading, nothing if needs are unavailable. */
function HeaderNeedMap({ slug }: { slug: string }) {
  const needs = useClubNeeds(slug)
  if (needs.isPending) return <Skeleton className="aspect-[105/68] w-full bg-white/10" />
  if (needs.isError || !needs.data.needs.length) return null
  return <NeedMap needs={needs.data.needs} />
}

function SquadTable({ squad }: { squad: SquadPlayer[] }) {
  const [position, setPosition] = useState('all')
  const positions = useMemo(() => [...new Set(squad.map((player) => player.position))], [squad])
  const shown = position === 'all' ? squad : squad.filter((player) => player.position === position)

  if (!squad.length) return <EmptyState title="No squad data recorded for this season" />
  return (
    <div className="space-y-4">
      <div role="group" aria-label="Filter squad by position" className="flex flex-wrap gap-1.5">
        {['all', ...positions].map((code) => (
          <button
            key={code}
            type="button"
            aria-pressed={position === code}
            onClick={() => setPosition(code)}
            className={cn(
              'h-9 rounded-md border px-3 text-sm font-semibold transition-colors',
              position === code
                ? 'border-pitch bg-pitch text-pitch-foreground'
                : 'border-input bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            {code === 'all' ? `All (${squad.length})` : code}
          </button>
        ))}
      </div>
      <ul className="divide-y rounded-lg border bg-card sm:hidden" aria-label="Squad">
        {shown.map((player) => (
          <li key={player.slug} className="flex items-center gap-3 px-4 py-3">
            <PositionChip code={player.position} title={player.position_label} />
            <div className="min-w-0 flex-1">
              <Link to={`/players/${player.slug}`} className="block truncate font-semibold hover:underline">
                {player.name}
              </Link>
              <p className="text-xs text-muted-foreground">
                Age {formatAge(player.age)}, {formatNumber(player.minutes)} min
                {player.best_role && <>, best as {player.best_role.name.toLowerCase()}</>}
              </p>
            </div>
            {player.best_role ? (
              <span className="text-right">
                <span className="block font-display text-xl leading-none font-semibold tabular-nums">
                  {formatScore(player.best_role.score)}
                </span>
                {player.best_role.coverage < 0.7 && (
                  <span className="text-xs text-warning-foreground">Incomplete data</span>
                )}
              </span>
            ) : (
              <span className="max-w-20 text-right text-xs leading-tight text-muted-foreground">
                Not enough data to score
              </span>
            )}
          </li>
        ))}
      </ul>
      <div className="hidden overflow-hidden rounded-lg border bg-card sm:block" data-scroll-x>
        <Table className="min-w-[40rem]">
          <TableHeader className="bg-muted/60">
            <TableRow>
              <TableHead className="pl-4">Player</TableHead>
              <TableHead>Pos.</TableHead>
              <TableHead className="text-right">Age</TableHead>
              <TableHead className="text-right">Minutes</TableHead>
              <TableHead className="w-[38%] pr-4">Best role score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((player) => (
              <TableRow key={player.slug}>
                <TableCell className="pl-4">
                  <Link to={`/players/${player.slug}`} className="font-semibold hover:text-primary hover:underline">
                    {player.name}
                  </Link>
                  {player.secondary_positions.length > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      also {player.secondary_positions.join(', ')}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <PositionChip code={player.position} title={player.position_label} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatAge(player.age)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(player.minutes)}</TableCell>
                <TableCell className="pr-4">
                  {player.best_role ? (
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="w-10 font-display text-lg font-semibold tabular-nums">
                        {formatScore(player.best_role.score)}
                      </span>
                      <ScoreBar
                        value={player.best_role.score}
                        label={`${player.name} ${player.best_role.name} score`}
                        className="w-20"
                      />
                      <span className="text-xs text-muted-foreground">{player.best_role.name}</span>
                      {player.best_role.coverage < 0.7 && <CoverageBadge coverage={player.best_role.coverage} />}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Not enough data to score</span>
                  )}
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
  return (
    <>
      <PageHeader
        band
        back={{ to: '/', label: 'All clubs' }}
        context={
          <span className="flex items-center gap-2">
            <span className="font-display text-lg font-bold text-floodlight">{data.club.short_name}</span>
            {data.club.is_demo && <DemoBadge />}
          </span>
        }
        title={data.club.name}
        meta={<SourceLine meta={data} className="text-pitch-muted" />}
        aside={
          <div className="w-full lg:w-[30rem]">
            <HeaderNeedMap slug={slug} />
          </div>
        }
      />

      <PageBody className="pt-6 sm:pt-8">
        <Tabs
          value={tab}
          onValueChange={(value) => setSearchParams(value === 'squad' ? { tab: 'squad' } : {}, { replace: true })}
        >
          <TabsList variant="line" className="h-auto w-full justify-start gap-6 rounded-none border-b p-0">
            <TabsTrigger value="needs" className="flex-none px-0 pb-3 font-display text-xl font-semibold">
              Squad needs
            </TabsTrigger>
            <TabsTrigger value="squad" className="flex-none px-0 pb-3 font-display text-xl font-semibold">
              Squad ({data.squad.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="needs" className="mt-6">
            <NeedsPanel slug={slug} />
          </TabsContent>
          <TabsContent value="squad" className="mt-6">
            <SquadTable squad={data.squad} />
          </TabsContent>
        </Tabs>
      </PageBody>
    </>
  )
}
