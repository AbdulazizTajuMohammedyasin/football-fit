import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { vi } from 'vitest'

/** Render a page inside a fresh query client and memory router. */
export function renderRoute(path: string, routePath: string, element: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter([{ path: routePath, element }], { initialEntries: [path] })
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

/** Stub fetch with a map of API path prefix → JSON body (or status code for errors). */
export function stubApi(routes: Record<string, unknown>) {
  const fn = vi.fn((input: string) => {
    const url = new URL(input, 'http://localhost')
    const key = Object.keys(routes)
      .sort((a, b) => b.length - a.length)
      .find((prefix) => url.pathname.startsWith(prefix))
    const body = key === undefined ? 404 : routes[key]
    if (typeof body === 'number') {
      return Promise.resolve({ ok: false, status: body, json: () => Promise.resolve({ detail: 'Not found.' }) })
    }
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) })
  })
  vi.stubGlobal('fetch', fn)
  return fn
}
