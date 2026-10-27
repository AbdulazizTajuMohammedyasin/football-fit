import { FlaskConical, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'

import { useMeta } from '@/api/queries'
import { useAuth } from '@/auth/AuthProvider'
import { Container } from '@/components/page'
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
    <div className="border-b border-need-medium/25 bg-warning text-warning-foreground">
      <Container>
        <p className="flex items-start gap-2 py-2 text-sm">
          <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden />
          {allDemo ? (
            <span>
              <strong>Demo data.</strong> Clubs, players and statistics shown are fictional and generated for
              demonstration (as of {formatDate(demo[0].as_of)}). They are not real Premier League figures.
            </span>
          ) : (
            <span>
              <strong>Includes demo data.</strong> Anything marked “Demo” is fictional and generated for
              demonstration, not real football statistics.
            </span>
          )}
        </p>
      </Container>
    </div>
  )
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'relative block rounded-sm px-3 py-2 text-sm font-medium text-pitch-muted transition-colors hover:text-pitch-foreground',
    'md:after:absolute md:after:inset-x-3 md:after:-bottom-[13px] md:after:h-[3px] md:after:rounded-full',
    isActive && 'text-pitch-foreground md:after:bg-floodlight',
    isActive && 'max-md:bg-white/10',
  )

function AccountNav() {
  const { user, checking, signOut } = useAuth()
  const navigate = useNavigate()
  if (checking) return null
  if (!user) {
    return (
      <li>
        <NavLink to="/signin" className={navLinkClass}>
          Sign in
        </NavLink>
      </li>
    )
  }
  return (
    <>
      <li>
        <NavLink to="/shortlists" className={navLinkClass}>
          My shortlists
        </NavLink>
      </li>
      <li>
        <button
          type="button"
          className="block w-full rounded-sm px-3 py-2 text-left text-sm font-medium text-pitch-muted transition-colors hover:text-pitch-foreground"
          onClick={() => {
            signOut()
            navigate('/')
          }}
        >
          Sign out
        </button>
      </li>
    </>
  )
}

function Wordmark() {
  return (
    <Link to="/" className="flex items-center gap-2.5 rounded-sm" aria-label="Football Fit home">
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <rect x="1" y="1" width="30" height="30" rx="5" fill="none" stroke="currentColor" strokeOpacity=".35" />
        <rect x="5" y="7" width="22" height="18" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <line x1="16" y1="7" x2="16" y2="25" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="16" cy="16" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <rect x="21" y="12" width="6" height="8" fill="var(--floodlight)" />
      </svg>
      <span className="font-display text-2xl leading-none font-bold tracking-tight">Football Fit</span>
    </Link>
  )
}

export function Layout() {
  const location = useLocation()
  // The phone menu stays open only on the route where it was opened, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null)
  const menuOpen = openOn === location.pathname

  const links = (
    <>
      {NAV.map((item) => (
        <li key={item.to}>
          <NavLink to={item.to} end={item.end} className={navLinkClass}>
            {item.label}
          </NavLink>
        </li>
      ))}
      <AccountNav />
    </>
  )

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-background focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-pitch text-pitch-foreground">
        <Container className="flex h-16 items-center justify-between gap-4">
          <Wordmark />
          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex items-center gap-1">{links}</ul>
          </nav>
          <button
            type="button"
            className="-mr-2 grid size-11 place-items-center rounded-sm text-pitch-foreground md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setOpenOn(menuOpen ? null : location.pathname)}
          >
            {menuOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </Container>
        {menuOpen && (
          <nav id="mobile-nav" aria-label="Main" className="border-t border-white/10 md:hidden">
            <Container>
              <ul className="space-y-1 py-3">{links}</ul>
            </Container>
          </nav>
        )}
      </header>
      <DataNotice />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <footer className="pitch-band mt-12">
        <Container className="flex flex-col gap-3 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-pitch-muted">
            Fit scores are transparent ranking aids built from recorded statistics, not predictions of transfer
            success.
          </p>
          <Link to="/methodology" className="font-medium text-pitch-foreground underline-offset-4 hover:underline">
            Read how scoring works
          </Link>
        </Container>
      </footer>
    </div>
  )
}
