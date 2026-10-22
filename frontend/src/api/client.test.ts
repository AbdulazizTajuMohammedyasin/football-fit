import { afterEach, describe, expect, it, vi } from 'vitest'

import { apiGet, ApiError, buildQuery } from './client'

function mockFetch(response: Partial<Response> | Error) {
  const fn = vi.fn(() => (response instanceof Error ? Promise.reject(response) : Promise.resolve(response as Response)))
  vi.stubGlobal('fetch', fn)
  return fn
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('buildQuery', () => {
  it('skips empty values but keeps false and zero', () => {
    expect(buildQuery({ a: 'x', b: null, c: undefined, d: '', e: false, f: 0 })).toBe('?a=x&e=false&f=0')
    expect(buildQuery({})).toBe('')
  })
})

describe('apiGet', () => {
  it('returns parsed JSON on success', async () => {
    const fetch = mockFetch({ ok: true, json: () => Promise.resolve({ status: 'ok' }) })
    await expect(apiGet('/health/', { q: 1 })).resolves.toEqual({ status: 'ok' })
    expect(fetch).toHaveBeenCalledWith('/api/health/?q=1', expect.anything())
  })

  it('surfaces DRF validation messages', async () => {
    mockFetch({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ role: ['"x" is not a valid choice.'], non_field_errors: ['Bad range'] }),
    })
    const error = await apiGet('/clubs/a/recommendations/').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(400)
    expect((error as ApiError).message).toBe('role: "x" is not a valid choice. Bad range')
  })

  it('uses the detail message for 404s', async () => {
    mockFetch({ ok: false, status: 404, json: () => Promise.resolve({ detail: 'Not found.' }) })
    await expect(apiGet('/clubs/missing/')).rejects.toThrow('Not found.')
  })

  it('falls back to the status when the body is not JSON', async () => {
    mockFetch({ ok: false, status: 502, json: () => Promise.reject(new SyntaxError('bad')) })
    await expect(apiGet('/meta/')).rejects.toThrow('Request failed (502)')
  })

  it('explains network failures', async () => {
    mockFetch(new TypeError('Failed to fetch'))
    await expect(apiGet('/meta/')).rejects.toThrow(/Could not reach the Football Fit API/)
  })
})
