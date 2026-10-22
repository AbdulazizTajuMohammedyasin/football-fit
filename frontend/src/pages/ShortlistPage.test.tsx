import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderRoute, stubApi } from '@/test/render'

import { ShortlistPage } from './ShortlistPage'

const source = { slug: 'demo', name: 'Demo', is_demo: true, licence: '', url: '', notes: '', as_of: '2026-05-31' }
const league = { source, competition: 'Demo League', season: '2025-26', as_of: '2026-05-31' }
const club = { slug: 'a', name: 'Ashcombe Albion', short_name: 'Ashcombe', competition: 'Demo League', is_demo: true }
const role = {
  key: 'st-poacher',
  position: 'ST',
  name: 'Penalty-box striker',
  summary: 'Gets into the box.',
  weights: [{ metric: 'np_xg_p90', label: 'Non-penalty xG', weight: 1 }],
}
const meta = {
  sources: [source],
  positions: [{ code: 'ST', label: 'Striker', target_depth: 3 }],
  metrics: [{ key: 'np_xg_p90', label: 'Non-penalty xG', unit: 'per90', higher_is_better: true, description: '' }],
  roles: [role],
  scoring: {
    benchmark_min_minutes: 900,
    reliable_coverage: 0.7,
    full_reliability_minutes: 2500,
    fit_weights: {},
    need_weights: {},
    ageing_threshold: 31,
  },
}
const shortlist = {
  ...league,
  club,
  role,
  filters: {},
  incumbent_best: 61.2,
  considered: 3,
  excluded_low_coverage: 1,
  reliable_coverage: 0.7,
  results: [
    {
      player: {
        slug: 'p1',
        name: 'Callum Nakamura',
        position: 'ST',
        position_label: 'Striker',
        secondary_positions: [],
        age: 24,
        nationality: 'Japan',
        preferred_foot: 'right',
        club: { ...club, slug: 'b', name: 'Brackenford City' },
        minutes: 2400,
        appearances: 30,
      },
      fit: {
        score: 82.4,
        components: [{ key: 'role_quality', label: 'Role quality', weight: 0.6, value: 90, explanation: 'Weighted.' }],
      },
      role_score: {
        role: 'st-poacher',
        role_name: 'Penalty-box striker',
        score: 90,
        coverage: 0.6,
        reliable: false,
        components: [
          {
            metric: 'np_xg_p90',
            label: 'Non-penalty xG',
            weight: 1,
            value: null,
            percentile: null,
            higher_is_better: true,
            missing: true,
          },
        ],
      },
      low_coverage: true,
      plays_secondary: false,
    },
  ],
}

afterEach(() => {
  vi.unstubAllGlobals()
})

function recommendationCalls(fetch: ReturnType<typeof stubApi>) {
  return fetch.mock.calls.map(([url]) => String(url)).filter((url) => url.includes('/recommendations/'))
}

describe('ShortlistPage', () => {
  it('renders ranked results with coverage warnings and hidden-player explanation', async () => {
    stubApi({ '/api/meta/': meta, '/api/clubs/a/recommendations/': shortlist, '/api/clubs/a/': { ...league, club, squad: [] } })
    renderRoute('/clubs/a/shortlist?role=st-poacher', '/clubs/:slug/shortlist', <ShortlistPage />)

    expect(await screen.findByRole('link', { name: 'Callum Nakamura' })).toHaveAttribute('href', '/players/p1')
    expect(screen.getByText('Incomplete data · 60%')).toBeInTheDocument()
    expect(screen.getByText(/1 hidden because less than 70%/)).toBeInTheDocument()
    expect(screen.getByText(/best established player in this role scores 61.2/)).toBeInTheDocument()
  })

  it('validates filters before requesting and sends valid ones to the API', async () => {
    const fetch = stubApi({
      '/api/meta/': meta,
      '/api/clubs/a/recommendations/': shortlist,
      '/api/clubs/a/': { ...league, club, squad: [] },
    })
    renderRoute('/clubs/a/shortlist?role=st-poacher', '/clubs/:slug/shortlist', <ShortlistPage />)
    await screen.findByRole('link', { name: 'Callum Nakamura' })
    const before = recommendationCalls(fetch).length

    await userEvent.type(screen.getByLabelText('Minimum'), '30')
    await userEvent.type(screen.getByLabelText('Maximum'), '25')
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Minimum age cannot be greater than maximum age.')
    expect(recommendationCalls(fetch)).toHaveLength(before)

    await userEvent.clear(screen.getByLabelText('Minimum'))
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))
    await waitFor(() => expect(recommendationCalls(fetch).some((url) => url.includes('max_age=25'))).toBe(true))
  })

  it('asks for a role when none is selected', async () => {
    stubApi({ '/api/meta/': meta, '/api/clubs/a/': { ...league, club, squad: [] } })
    renderRoute('/clubs/a/shortlist', '/clubs/:slug/shortlist', <ShortlistPage />)
    expect(await screen.findByText('Choose a role to build a shortlist')).toBeInTheDocument()
  })
})
