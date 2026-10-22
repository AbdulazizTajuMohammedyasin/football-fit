import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { apiGet } from './client'
import type {
  ClubDetail,
  ClubListItem,
  ClubNeeds,
  Comparison,
  Meta,
  PlayerDetail,
  PlayerListItem,
  Shortlist,
} from './types'

export interface ShortlistParams {
  role: string
  max_age?: number | null
  min_age?: number | null
  min_minutes?: number | null
  include_low_coverage?: boolean
  include_secondary?: boolean
  limit?: number
}

export function useMeta() {
  return useQuery({
    queryKey: ['meta'],
    queryFn: ({ signal }) => apiGet<Meta>('/meta/', {}, signal),
    staleTime: Infinity,
  })
}

export function useClubs() {
  return useQuery({
    queryKey: ['clubs'],
    queryFn: ({ signal }) => apiGet<ClubListItem[]>('/clubs/', {}, signal),
  })
}

export function useClub(slug: string) {
  return useQuery({
    queryKey: ['club', slug],
    queryFn: ({ signal }) => apiGet<ClubDetail>(`/clubs/${slug}/`, {}, signal),
  })
}

export function useClubNeeds(slug: string) {
  return useQuery({
    queryKey: ['club', slug, 'needs'],
    queryFn: ({ signal }) => apiGet<ClubNeeds>(`/clubs/${slug}/needs/`, {}, signal),
  })
}

export function useShortlist(slug: string, params: ShortlistParams | null) {
  return useQuery({
    queryKey: ['club', slug, 'shortlist', params],
    queryFn: ({ signal }) =>
      apiGet<Shortlist>(`/clubs/${slug}/recommendations/`, { ...params }, signal),
    enabled: params !== null,
    placeholderData: keepPreviousData,
  })
}

export function usePlayer(slug: string) {
  return useQuery({
    queryKey: ['player', slug],
    queryFn: ({ signal }) => apiGet<PlayerDetail>(`/players/${slug}/`, {}, signal),
  })
}

export function usePlayerSearch(search: string) {
  const term = search.trim()
  return useQuery({
    queryKey: ['players', term],
    queryFn: ({ signal }) => apiGet<PlayerListItem[]>('/players/', { search: term, limit: 8 }, signal),
    enabled: term.length >= 2,
    placeholderData: keepPreviousData,
  })
}

export function useComparison(players: string[], role: string | null) {
  return useQuery({
    queryKey: ['compare', players, role],
    queryFn: ({ signal }) =>
      apiGet<Comparison>('/compare/', { players: players.join(','), role }, signal),
    enabled: players.length >= 2,
    placeholderData: keepPreviousData,
  })
}
