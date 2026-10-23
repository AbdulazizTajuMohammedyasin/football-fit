import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/auth/AuthProvider'
import { authedRequest } from '@/auth/session'

import type { SavedShortlist } from './types'

const KEY = ['my-shortlists']

export function useMyShortlists() {
  const { user } = useAuth()
  return useQuery({
    queryKey: KEY,
    queryFn: () => authedRequest<SavedShortlist[]>('GET', '/me/shortlists/'),
    enabled: user !== null,
  })
}

function useInvalidating<TVariables, TResult>(fn: (variables: TVariables) => Promise<TResult>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useCreateShortlist() {
  return useInvalidating((body: { name: string; club_slug?: string; role_key?: string }) =>
    authedRequest<SavedShortlist>('POST', '/me/shortlists/', { body }),
  )
}

export function useDeleteShortlist() {
  return useInvalidating((id: number) => authedRequest<void>('DELETE', `/me/shortlists/${id}/`))
}

export function useAddToShortlist() {
  return useInvalidating(({ id, playerSlug, note }: { id: number; playerSlug: string; note?: string }) =>
    authedRequest<SavedShortlist>('POST', `/me/shortlists/${id}/players/`, {
      body: { player_slug: playerSlug, note: note ?? '' },
    }),
  )
}

export function useRemoveFromShortlist() {
  return useInvalidating(({ id, playerSlug }: { id: number; playerSlug: string }) =>
    authedRequest<void>('DELETE', `/me/shortlists/${id}/players/${playerSlug}/`),
  )
}
