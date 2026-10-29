import { ChevronRight, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'

import { useMeta } from '@/api/queries'
import { useAuth } from '@/auth/AuthProvider'
import { Container } from '@/components/page'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', label: 'Clubs', end: true },
  { to: '/compare', label: 'Compare' },
  { to: '/methodology', label: 'How scoring works' },
]

function DataNotice() {
  const { data } = useMeta()
  const demo = data?.sources.filter((source) => source.is_demo) ?? []
  if (!demo.length) return null
  const allDemo = demo.length === data?.sources.length
  return (
    <div className="border-b bg-caution-bg text-caution">
      <Container>
        <p className="type-label flex items-start gap-2 py-2 sm:items-center">
          <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-caution sm:mt-0" />
          <span>
            {allDemo ? (
              <>
                <strong className="font-medium">Demo data.</strong> Clubs, players and statistics are fictional,
                generated for demonstration (as of {formatDate(demo[0].as_of)}), not real Premier League figures.
              </>
            ) : (
              <>
                <strong className="font-medium">Includes demo data:</strong> anything tagged “Demo” is fictional.{' '}
                <Link to="/methodology#sources" className="underline underline-offset-2 hover:no-underline">
                  About the data
                </Link>
              </>
            )}
          </span>
        </p>
      </Container>
    </div>
  )
}

function Wordmark() {
  return (
    <Link to="/" className="flex items-center gap-2.5 rounded-md" aria-label="Football Fit home">
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="7" className="fill-signal" />
        <rect x="6" y="8" width="20" height="16" rx="1.5" fill="none" className="stroke-on-ink" strokeWidth="1.5" />
        <line x1="16" y1="8" x2="16" y2="24" className="stroke-on-ink" strokeWidth="1.5" />
        <circle cx="16" cy="16" r="3" className="fill-on-ink" />
      </svg>
      <span className="font-display text-2xl font-bold tracking-wide uppercase">Football Fit</span>
    </Link>
  )
}

const pillClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'block rounded-full px-3.5 py-1.5 font-mono text-[13px] transition-colors',
    isActive ? 'bg-signal text-on-ink' : 'text-ink-2 hover:bg-tissue hover:text-ink',
  )

const sheetClass = ({ isActive }: { isActive: boolean }) =>
  cn('flex min-h-14 items-center justify-between border-b text-lg', isActive ? 'text-ink' : 'text-ink-2 hover:text-ink')

export function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, checking, signOut } = useAuth()
  // The phone menu stays open only on the route where it was opened, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null)
  const menuOpen = openOn === location.pathname

  function handleSignOut() {
    signOut()
    navigate('/')
  }

  const links = [...NAV, ...(user ? [{ to: '/shortlists', label: 'My shortlists', end: false }] : [])]

  return (
    <div className="flex min-h-screen flex-col">
      <div className="ambient" aria-hidden />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-paper focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b bg-bone/85 backdrop-blur-md">
        <Container className="flex h-16 items-center justify-between gap-4">
          <Wordmark />
          <nav aria-label="Main" className="hidden items-center gap-3 md:flex">
            <ul className="flex items-center gap-0.5 rounded-full border bg-paper p-1">
              {links.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} className={pillClass}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
            {!checking &&
              (user ? (
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  Sign out
                </Button>
              ) : (
                <Button asChild variant="outline" size="sm">
                  <NavLink to="/signin">Sign in</NavLink>
                </Button>
              ))}
          </nav>
          <Button
            variant={menuOpen ? 'outline' : 'default'}
            size="icon-lg"
            className="-mr-1 md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setOpenOn(menuOpen ? null : location.pathname)}
          >
            {menuOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </Button>
        </Container>
        {menuOpen && (
          <nav
            id="mobile-nav"
            aria-label="Main"
            className="fixed inset-x-0 top-16 bottom-0 z-40 flex flex-col overflow-y-auto bg-bone md:hidden"
          >
            <Container className="flex flex-1 flex-col pb-6">
              <ul>
                {links.map((item) => (
                  <li key={item.to}>
                    <NavLink to={item.to} end={item.end} className={sheetClass}>
                      {item.label}
                      <ChevronRight className="size-5 text-ink-2" aria-hidden />
                    </NavLink>
                  </li>
                ))}
              </ul>
              {!checking && (
                <div className="mt-auto pt-8">
                  {user ? (
                    <Button variant="outline" size="lg" className="w-full" onClick={handleSignOut}>
                      Sign out
                    </Button>
                  ) : (
                    <Button asChild size="lg" className="w-full">
                      <Link to="/signin">Sign in</Link>
                    </Button>
                  )}
                </div>
              )}
            </Container>
          </nav>
        )}
      </header>
      <DataNotice />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <footer className="stadium mt-16 border-t">
        <Container className="grid gap-8 py-10 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="space-y-3">
            <p className="font-display text-3xl font-bold uppercase">Football Fit</p>
            <p className="max-w-md text-[15px] text-ink-2">
              Fit scores are transparent ranking aids built from recorded statistics, not predictions of transfer
              success.
            </p>
          </div>
          <ul className="type-label flex flex-wrap gap-x-6 gap-y-2 text-ink-2">
            {NAV.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="hover:text-signal hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </footer>
    </div>
  )
}
