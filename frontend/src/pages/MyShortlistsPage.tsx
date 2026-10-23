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
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Badge } from '@/components/ui/badge'
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
    <article className="space-y-3 rounded-lg border bg-card p-4" aria-labelledby={`list-${list.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={`list-${list.id}`} className="text-lg font-semibold">
            {list.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            {[list.club_name && `For ${list.club_name}`, list.role_name, `updated ${formatDate(list.updated_at.slice(0, 10))}`]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <div className="flex gap-2">
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
          <Button
            variant="ghost"
            size="sm"
            disabled={destroy.isPending}
            onClick={() => {
              if (window.confirm(`Delete “${list.name}”? This cannot be undone.`)) destroy.mutate(list.id)
            }}
          >
            <Trash2 aria-hidden /> Delete
          </Button>
        </div>
      </div>

      {list.entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No players yet. Use “Save” on a shortlist or player page.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {list.entries.map(({ player, note }) => (
            <li key={player.slug} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              {player.available ? (
                <span>
                  <Link to={`/players/${player.slug}`} className="font-medium hover:underline">
                    {player.name}
                  </Link>{' '}
                  <span className="text-muted-foreground">
                    {player.position} · {player.club ?? 'No club'}
                  </span>
                  {player.is_demo && (
                    <Badge variant="outline" className="ml-2">
                      Demo
                    </Badge>
                  )}
                  {note && <span className="block text-xs text-muted-foreground">{note}</span>}
                </span>
              ) : (
                <span className="text-muted-foreground">
                  {player.slug} — no longer in the current data (it may have been re-imported or removed)
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

  if (checking) return <LoadingState label="Checking your session" rows={2} />
  if (!user) return <Navigate to="/signin?next=/shortlists" replace />

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    create.mutate({ name: name.trim() }, { onSuccess: () => setName('') })
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">My shortlists</h1>
        <p className="text-muted-foreground">Players you have saved, signed in as {user.username}.</p>
      </header>

      <form onSubmit={submit} className="flex max-w-md items-end gap-2">
        <div className="flex-1 space-y-1">
          <Label htmlFor="new-shortlist">New shortlist</Label>
          <Input
            id="new-shortlist"
            value={name}
            maxLength={100}
            placeholder="e.g. Left-back options"
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={create.isPending || !name.trim()}>
          Create
        </Button>
      </form>
      {create.isError && (
        <p role="alert" className="text-sm text-destructive">
          {create.error.message}
        </p>
      )}

      {lists.isPending ? (
        <LoadingState label="Loading your shortlists" rows={2} />
      ) : lists.isError ? (
        <ErrorState error={lists.error} onRetry={() => lists.refetch()} />
      ) : lists.data.length === 0 ? (
        <EmptyState title="No saved shortlists yet">
          Build a shortlist from a club's needs, then use “Save” on any player.
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {lists.data.map((list) => (
            <ShortlistCard key={list.id} list={list} />
          ))}
        </div>
      )}
    </div>
  )
}
