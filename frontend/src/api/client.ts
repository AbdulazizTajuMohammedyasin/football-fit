const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** Turn a DRF error body into one readable sentence. */
function describeError(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  if ('detail' in body && typeof body.detail === 'string') return body.detail
  const parts = Object.entries(body as Record<string, unknown>).map(([field, value]) => {
    const text = Array.isArray(value) ? value.join(' ') : String(value)
    return field === 'non_field_errors' ? text : `${field}: ${text}`
  })
  return parts.length ? parts.join(' ') : null
}

export type QueryParams = Record<string, string | number | boolean | null | undefined>

export function buildQuery(params: QueryParams): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue
    search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

export async function apiGet<T>(path: string, params: QueryParams = {}, signal?: AbortSignal): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}/api${path}${buildQuery(params)}`, {
      headers: { Accept: 'application/json' },
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'Could not reach the Football Fit API. Is the backend running?')
  }

  if (!response.ok) {
    let message: string | null = null
    try {
      message = describeError(await response.json())
    } catch {
      // Non-JSON error body; fall back to the status text.
    }
    throw new ApiError(response.status, message ?? `Request failed (${response.status})`)
  }
  return (await response.json()) as T
}
