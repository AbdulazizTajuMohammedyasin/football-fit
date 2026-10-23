import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { authedRequest, readTokens, SESSION_EXPIRED, writeTokens } from './session'

function respond(status: number, body: unknown = {}) {
  return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) } as Response)
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('authedRequest', () => {
  it('refuses to call the API without a session', async () => {
    await expect(authedRequest('GET', '/me/shortlists/')).rejects.toThrow('Please sign in first.')
  })

  it('sends the access token as a bearer header', async () => {
    writeTokens({ access: 'A1', refresh: 'R1' })
    const fetch = vi.fn(() => respond(200, []))
    vi.stubGlobal('fetch', fetch)
    await authedRequest('GET', '/me/shortlists/')
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer A1')
  })

  it('refreshes an expired access token once and retries', async () => {
    writeTokens({ access: 'old', refresh: 'R1' })
    const fetch = vi
      .fn()
      .mockImplementationOnce(() => respond(401, { detail: 'Token expired' }))
      .mockImplementationOnce(() => respond(200, { access: 'new' }))
      .mockImplementationOnce(() => respond(200, ['ok']))
    vi.stubGlobal('fetch', fetch)

    await expect(authedRequest('GET', '/me/shortlists/')).resolves.toEqual(['ok'])
    expect(fetch.mock.calls[1][0]).toBe('/api/auth/jwt/refresh/')
    expect(readTokens()).toEqual({ access: 'new', refresh: 'R1' })
    const [, retry] = fetch.mock.calls[2] as [string, RequestInit]
    expect((retry.headers as Record<string, string>).Authorization).toBe('Bearer new')
  })

  it('signs out when the refresh token is also rejected', async () => {
    writeTokens({ access: 'old', refresh: 'expired' })
    vi.stubGlobal(
      'fetch',
      vi.fn(() => respond(401, { detail: 'Token is invalid or expired' })),
    )
    await expect(authedRequest('GET', '/me/shortlists/')).rejects.toThrow(SESSION_EXPIRED)
    expect(readTokens()).toBeNull()
  })

  it('does not refresh on other errors', async () => {
    writeTokens({ access: 'A1', refresh: 'R1' })
    const fetch = vi.fn(() => respond(400, { name: ['Name cannot be blank.'] }))
    vi.stubGlobal('fetch', fetch)
    await expect(authedRequest('POST', '/me/shortlists/', { body: {} })).rejects.toThrow('name: Name cannot be blank.')
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
