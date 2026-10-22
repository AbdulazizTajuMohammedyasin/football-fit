import { ArrowRight } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router'

import { useClub, useClubNeeds } from '@/api/queries'
import type { PositionNeed, SquadPlayer } from '@/api/types'
import { CoverageBadge, NeedBadge, ScoreBar } from '@/components/score'
import { SourceLine } from '@/components/SourceLine'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatAge, formatNumber, formatScore, withArticle } from '@/lib/format'

function NeedCard({ need, clubSlug }: { need: PositionNeed; clubSlug: string }) {
  return (
    <article className="rounded-lg border bg-card p-4" aria-labelledby={`need-${need.position}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id={`need-${need.position}`} className="text-lg font-semibold">
            {need.label}
          </h3>
          <p className="text-sm text-muted-foreground">
            {need.squad_count} recognised · target {need.target_depth}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <NeedBadge level={need.level} />
          <span className="text-2xl font-semibold tabular-nums">{formatScore(need.score)}</span>
        </div>
      </div>

      <ScoreBar value={need.score} label={`${need.label} need score`} className="mt-3" invert />

      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        {need.components.map((component) => (
          <div key={component.key} className="space-y-1">
            <dt className="flex justify-between text-xs text-muted-foreground">
              <span>{component.label}</span>
              <span>weight {Math.round(component.weight * 100)}%</span>
            </dt>
            <dd className="flex items-center gap-2">
              <ScoreBar value={component.value} label={component.label} invert />
              <span className="w-10 text-right text-sm tabular-nums">
                {component.value === null ? 'n/a' : Math.round(component.value)}
              </span>
            </dd>
          </div>
        ))}
      </dl>

      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">
        {need.evidence.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap gap-2">
        {need.roles.map((role) => (
          <Button key={role.key} asChild variant={need.level === 'high' ? 'default' : 'outline'} size="sm">
            <Link to={`/clubs/${clubSlug}/shortlist?role=${role.key}`}>
              Find {withArticle(role.name.toLowerCase())} <ArrowRight aria-hidden />
            </Link>
          </Button>
        ))}
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
      <p className="text-sm text-muted-foreground">
        Positions are ordered by need score (0–100, higher means a bigger need). Each score blends the
        components shown; missing components are left out rather than counted as zero.
      </p>
      {needs.data.needs.map((need) => (
        <NeedCard key={need.position} need={need} clubSlug={slug} />
      ))}
    </div>
  )
}

function SquadTable({ squad }: { squad: SquadPlayer[] }) {
  if (!squad.length) return <EmptyState title="No squad data recorded for this season" />
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Player</TableHead>
            <TableHead>Pos.</TableHead>
            <TableHead className="text-right">Age</TableHead>
            <TableHead className="text-right">Minutes</TableHead>
            <TableHead>Best role score</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {squad.map((player) => (
            <TableRow key={player.slug}>
              <TableCell>
                <Link to={`/players/${player.slug}`} className="font-medium hover:underline">
                  {player.name}
                </Link>
                {player.secondary_positions.length > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    also {player.secondary_positions.join(', ')}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" title={player.position_label}>
                  {player.position}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatAge(player.age)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatNumber(player.minutes)}</TableCell>
              <TableCell>
                {player.best_role ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="tabular-nums font-medium">{formatScore(player.best_role.score)}</span>
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
  )
}

export function ClubPage() {
  const { slug = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const club = useClub(slug)
  const tab = searchParams.get('tab') === 'squad' ? 'squad' : 'needs'

  if (club.isPending) return <LoadingState label="Loading club" />
  if (club.isError) return <ErrorState error={club.error} onRetry={() => club.refetch()} title="Could not load club" />

  const { data } = club
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link to="/" className="text-sm text-muted-foreground hover:underline">
          ← All clubs
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">{data.club.name}</h1>
          {data.club.is_demo && <Badge variant="outline">Demo</Badge>}
        </div>
        <SourceLine meta={data} />
      </header>

      <Tabs
        value={tab}
        onValueChange={(value) => setSearchParams(value === 'squad' ? { tab: 'squad' } : {}, { replace: true })}
      >
        <TabsList>
          <TabsTrigger value="needs">Squad needs</TabsTrigger>
          <TabsTrigger value="squad">Squad ({data.squad.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="needs" className="mt-4">
          <NeedsPanel slug={slug} />
        </TabsContent>
        <TabsContent value="squad" className="mt-4">
          <SquadTable squad={data.squad} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
