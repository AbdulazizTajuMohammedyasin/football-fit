import { Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router'

import {
  useCreateShortlist,
  useDeleteShortlist,
  useMyShortlists,
  useRemoveFromShortlist,
} from '@/api/savedShortlists'
import type { SavedShortlist } from '@/api/types'
import { useAuth } from '@/auth/AuthProvider'
import { PageBody, PageHeader } from '@/components/page'
import { DemoBadge, PositionChip } from '@/components/score'
import { EmptyState, ErrorState, LoadingState, PageLoading } from '@/components/states'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDate } from '@/lib/format'

function ShortlistCard({ list }: { list: SavedShortlist }) {
  const remove = useRemoveFromShortlist()
  const destroy = useDeleteShortlist()
  const available = list.entries.filter((entry) => entry.player.available).map((entry) => entry.player.slug)
  const compareLink =
    available.length >= 2
      ? `/compare?players=${available.slice(0, 4).join(',')}${list.role_key ? `&role=${list.role_key}` : ''}`
      : null

  return (
    <article className="overflow-hidden rounded-xl border bg-paper" aria-labelledby={`list-${list.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b p-5">
        <div className="min-w-0 space-y-1">
          <h2 id={`list-${list.id}`} className="type-sub break-words">
            {list.name}
          </h2>
          <p className="type-label flex flex-wrap gap-x-4 gap-y-0.5 text-ink-2">
            {list.club_name && <span>For {list.club_name}</span>}
            {list.role_name && <span>{list.role_name}</span>}
            <span>Updated {formatDate(list.updated_at.slice(0, 10))}</span>
            <span>
              {list.entries.length} {list.entries.length === 1 ? 'player' : 'players'}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {list.club_slug && list.role_key && list.club_name && (
            <Button asChild variant="outline" size="sm">
              <Link to={`/clubs/${list.club_slug}/shortlist?role=${list.role_key}`}>Open shortlist</Link>
            </Button>
          )}
          {compareLink && (
            <Button asChild variant="outline" size="sm">
              <Link to={compareLink}>Compare</Link>
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" disabled={destroy.isPending}>
                <Trash2 aria-hidden /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle>Delete “{list.name}”?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the list and its {list.entries.length} saved{' '}
                {list.entries.length === 1 ? 'player' : 'players'}. It cannot be undone.
              </AlertDialogDescription>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep list</AlertDialogCancel>
                <AlertDialogAction onClick={() => destroy.mutate(list.id)}>Delete list</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {list.entries.length === 0 ? (
        <p className="p-5 text-[15px] text-ink-2">No players yet. Use “Save” on a shortlist or player page.</p>
      ) : (
        <ul className="divide-y">
          {list.entries.map(({ player, note }) => (
            <li key={player.slug} className="flex items-center justify-between gap-3 px-5 py-2.5 text-[15px]">
              {player.available ? (
                <span className="flex min-w-0 items-center gap-3">
                  {player.position && <PositionChip code={player.position} />}
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <Link to={`/players/${player.slug}`} className="font-medium hover:underline">
                        {player.name}
                      </Link>
                      {player.is_demo && <DemoBadge />}
                    </span>
                    <span className="type-label block text-ink-2">{player.club ?? 'No club'}</span>
                    {note && <span className="block text-sm text-ink-2">{note}</span>}
                  </span>
                </span>
              ) : (
                <span className="text-ink-2">
                  No longer in the current data <span className="type-label">({player.slug})</span>. It may have
                  been re-imported or removed.
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                disabled={remove.isPending}
                aria-label={`Remove ${player.name ?? player.slug}`}
                onClick={() => remove.mutate({ id: list.id, playerSlug: player.slug })}
              >
                <X aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

export function MyShortlistsPage() {
  const { user, checking } = useAuth()
  const lists = useMyShortlists()
  const create = useCreateShortlist()
  const [name, setName] = useState('')

  if (checking) return <PageLoading label="Checking your session" />
  if (!user) return <Navigate to="/signin?next=/shortlists" replace />

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    create.mutate({ name: name.trim() }, { onSuccess: () => setName('') })
  }

  return (
    <>
      <PageHeader
        context={`Signed in as ${user.username}`}
        title="My shortlists"
        meta="Players you have saved, grouped into your own lists."
      >
        <form onSubmit={submit} className="max-w-md space-y-1.5 pt-2">
          <Label htmlFor="new-shortlist" className="type-label font-normal text-ink-2">
            New shortlist
          </Label>
          <div className="flex items-stretch gap-1 rounded-lg border border-line-strong bg-paper p-1 focus-within:border-ink">
            <Input
              id="new-shortlist"
              className="border-0 bg-transparent focus-visible:shadow-none"
              value={name}
              maxLength={100}
              placeholder="e.g. Left-back options"
              onChange={(event) => setName(event.target.value)}
            />
            <Button type="submit" disabled={create.isPending || !name.trim()} aria-busy={create.isPending}>
              Create
            </Button>
          </div>
        </form>
        {create.isError && (
          <p role="alert" className="text-sm text-danger">
            {create.error.message}
          </p>
        )}
      </PageHeader>

      <PageBody>
        {lists.isPending ? (
          <LoadingState label="Loading your shortlists" rows={2} />
        ) : lists.isError ? (
          <ErrorState error={lists.error} onRetry={() => lists.refetch()} />
        ) : lists.data.length === 0 ? (
          <EmptyState title="No saved shortlists yet">
            Build a shortlist from a club's needs, then use “Save” on any player.
          </EmptyState>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {lists.data.map((list) => (
              <ShortlistCard key={list.id} list={list} />
            ))}
          </div>
        )}
      </PageBody>
    </>
  )
}
