import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderRoute, stubApi } from '@/test/render'

import { HomePage } from './HomePage'

const clubs = [
  { slug: 'a', name: 'Ashcombe Albion', short_name: 'Ashcombe', competition: 'Demo League', is_demo: true, squad_size: 22 },
  { slug: 'b', name: 'Brackenford City', short_name: 'Brackenford', competition: 'Demo League', is_demo: true, squad_size: 24 },
]

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('HomePage', () => {
  it('lists clubs with demo badges and filters them by name', async () => {
    stubApi({ '/api/clubs/': clubs })
    renderRoute('/', '/', <HomePage />)

    expect(await screen.findByText('Ashcombe Albion')).toBeInTheDocument()
    expect(screen.getAllByText('Demo')).toHaveLength(2)

    await userEvent.type(screen.getByLabelText('Filter clubs'), 'brack')
    expect(screen.queryByText('Ashcombe Albion')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Brackenford City/ })).toHaveAttribute('href', '/clubs/b')
  })

  it('explains how to load data when no clubs exist', async () => {
    stubApi({ '/api/clubs/': [] })
    renderRoute('/', '/', <HomePage />)
    expect(await screen.findByText('No clubs loaded yet')).toBeInTheDocument()
  })

  it('shows an error with a retry button when the API fails', async () => {
    stubApi({ '/api/clubs/': 500 })
    renderRoute('/', '/', <HomePage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load clubs')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
