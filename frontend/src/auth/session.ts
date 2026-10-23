import { ApiError, apiRequest, type RequestOptions } from '@/api/client'

/**
 * JWT session storage and authenticated requests.
 *
 * Tokens live in localStorage so a session survives reloads. Storage can be unavailable
 * (private mode, blocked site data), so every access is guarded and the app keeps working
 * signed-out in that case.
 */

const STORAGE_KEY = 'football-fit.session'

export interface Tokens {
  access: string
  refresh: string
}

type Listener = () => void
const listeners = new Set<Listener>()

export function readTokens(): Tokens | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Tokens>
    return parsed.access && parsed.refresh ? { access: parsed.access, refresh: parsed.refresh } : null
  } catch {
    return null
  }
}

export function writeTokens(tokens: Tokens | null) {
  try {
    if (tokens) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage unavailable: the session simply will not persist.
  }
  listeners.forEach((listener) => listener())
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const SESSION_EXPIRED = 'Your session has expired. Please sign in again.'

let refreshing: Promise<string | null> | null = null

/** Exchange the refresh token for a new access token; shared by concurrent callers. */
async function refreshAccess(): Promise<string | null> {
  const tokens = readTokens()
  if (!tokens) return null
  refreshing ??= apiRequest<{ access: string }>('POST', '/auth/jwt/refresh/', {
    body: { refresh: tokens.refresh },
  })
    .then(({ access }) => {
      writeTokens({ ...tokens, access })
      return access
    })
    .catch(() => {
      writeTokens(null)
      return null
    })
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

/** Request with the stored access token, refreshing it once if it has expired. */
export async function authedRequest<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  options: Omit<RequestOptions, 'token'> = {},
): Promise<T> {
  const tokens = readTokens()
  if (!tokens) throw new ApiError(401, 'Please sign in first.')
  try {
    return await apiRequest<T>(method, path, { ...options, token: tokens.access })
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error
    const access = await refreshAccess()
    if (!access) throw new ApiError(401, SESSION_EXPIRED)
    return apiRequest<T>(method, path, { ...options, token: access })
  }
}
