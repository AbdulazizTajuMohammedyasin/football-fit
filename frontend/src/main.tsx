import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Link, RouterProvider } from 'react-router'

import { AuthProvider } from '@/auth/AuthProvider'
import { Layout } from '@/components/Layout'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ClubPage } from '@/pages/ClubPage'
import { AuthPage } from '@/pages/AuthPage'
import { ComparePage } from '@/pages/ComparePage'
import { HomePage } from '@/pages/HomePage'
import { MethodologyPage } from '@/pages/MethodologyPage'
import { MyShortlistsPage } from '@/pages/MyShortlistsPage'
import { PlayerPage } from '@/pages/PlayerPage'
import { ShortlistPage } from '@/pages/ShortlistPage'

import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1, refetchOnWindowFocus: false },
  },
})

function NotFound() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <Link to="/" className="text-primary hover:underline">
        Back to clubs
      </Link>
    </div>
  )
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'clubs/:slug', element: <ClubPage /> },
      { path: 'clubs/:slug/shortlist', element: <ShortlistPage /> },
      { path: 'players/:slug', element: <PlayerPage /> },
      { path: 'compare', element: <ComparePage /> },
      { path: 'methodology', element: <MethodologyPage /> },
      { path: 'signin', element: <AuthPage mode="signin" /> },
      { path: 'signup', element: <AuthPage mode="signup" /> },
      { path: 'shortlists', element: <MyShortlistsPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <RouterProvider router={router} />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
