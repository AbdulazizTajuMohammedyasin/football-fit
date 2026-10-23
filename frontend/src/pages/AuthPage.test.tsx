import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { readTokens } from '@/auth/session'
import { renderRoute } from '@/test/render'

import { AuthPage } from './AuthPage'

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function respond(status: number, body: unknown) {
  return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) })
}

describe('AuthPage', () => {
  it('requires every field before contacting the API', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    renderRoute('/signin', '/signin', <AuthPage mode="signin" />)
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Please fill in every field.')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('shows a friendly message for wrong credentials', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => respond(401, { detail: 'No active account found with the given credentials' })),
    )
    renderRoute('/signin', '/signin', <AuthPage mode="signin" />)
    await userEvent.type(screen.getByLabelText('Username'), 'fan')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('do not match an account')
    expect(readTokens()).toBeNull()
  })

  it('stores tokens after a successful sign-in', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        url.includes('/jwt/create/')
          ? respond(200, { access: 'A', refresh: 'R' })
          : respond(200, { id: 1, username: 'fan', email: 'fan@example.com' }),
      ),
    )
    renderRoute('/signin', '/signin', <AuthPage mode="signin" />)
    await userEvent.type(screen.getByLabelText('Username'), 'fan')
    await userEvent.type(screen.getByLabelText('Password'), 'correct-horse')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await vi.waitFor(() => expect(readTokens()).toEqual({ access: 'A', refresh: 'R' }))
  })

  it('shows server validation errors when signing up', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => respond(400, { password: ['This password is too common.'] })),
    )
    renderRoute('/signup', '/signup', <AuthPage mode="signup" />)
    await userEvent.type(screen.getByLabelText('Username'), 'fan')
    await userEvent.type(screen.getByLabelText('Email'), 'fan@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'password')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('password: This password is too common.')
  })
})
