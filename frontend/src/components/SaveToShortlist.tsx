import { Bookmark, Check, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router'

import {
  useAddToShortlist,
  useCreateShortlist,
  useMyShortlists,
  useRemoveFromShortlist,
} from '@/api/savedShortlists'
import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

/** Toggle a player on the signed-in user's saved shortlists, or prompt to sign in. */
export function SaveToShortlist({
  playerSlug,
  playerName,
  clubSlug,
  roleKey,
}: {
  playerSlug: string
  playerName: string
  clubSlug?: string
  roleKey?: string
}) {
  const { user } = useAuth()
  const location = useLocation()
  const lists = useMyShortlists()
  const add = useAddToShortlist()
  const remove = useRemoveFromShortlist()
  const create = useCreateShortlist()
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!user) {
    return (
      <Button asChild variant="ghost" size="sm">
        <Link to={`/signin?next=${encodeURIComponent(location.pathname + location.search)}`}>
          <Bookmark aria-hidden /> Sign in to save
        </Link>
      </Button>
    )
  }

  const savedIn = new Set(
    (lists.data ?? [])
      .filter((list) => list.entries.some((entry) => entry.player.slug === playerSlug))
      .map((list) => list.id),
  )
  const busy = add.isPending || remove.isPending || create.isPending

  async function toggle(id: number) {
    setError(null)
    try {
      if (savedIn.has(id)) await remove.mutateAsync({ id, playerSlug })
      else await add.mutateAsync({ id, playerSlug })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the list.')
    }
  }

  async function createAndAdd(event: FormEvent) {
    event.preventDefault()
    const name = newName.trim()
    if (!name) return
    setError(null)
    try {
      const list = await create.mutateAsync({ name, club_slug: clubSlug, role_key: roleKey })
      await add.mutateAsync({ id: list.id, playerSlug })
      setNewName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the list.')
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`Save ${playerName} to a shortlist`}>
          <Bookmark aria-hidden className={savedIn.size ? 'fill-current' : undefined} />
          {savedIn.size ? 'Saved' : 'Save'}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3">
        <p className="text-sm font-medium">Save {playerName} to…</p>
        {lists.isPending ? (
          <p className="text-sm text-muted-foreground">Loading your lists…</p>
        ) : lists.isError ? (
          <p className="text-sm text-destructive">{lists.error.message}</p>
        ) : lists.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">You have no saved shortlists yet.</p>
        ) : (
          <ul className="max-h-48 space-y-1 overflow-y-auto">
            {lists.data.map((list) => (
              <li key={list.id}>
                <button
                  type="button"
                  disabled={busy}
                  aria-pressed={savedIn.has(list.id)}
                  onClick={() => toggle(list.id)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent disabled:opacity-50"
                >
                  <span className="truncate">{list.name}</span>
                  {savedIn.has(list.id) && <Check className="size-4 text-primary" aria-label="Saved" />}
                </button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={createAndAdd} className="space-y-1.5 border-t pt-3">
          <Label htmlFor={`new-list-${playerSlug}`} className="text-xs">
            New shortlist
          </Label>
          <div className="flex gap-2">
            <Input
              id={`new-list-${playerSlug}`}
              value={newName}
              maxLength={100}
              placeholder="e.g. Striker targets"
              onChange={(event) => setNewName(event.target.value)}
            />
            <Button type="submit" size="icon" disabled={busy || !newName.trim()} aria-label="Create and save">
              <Plus aria-hidden />
            </Button>
          </div>
        </form>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}
