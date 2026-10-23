import { FlaskConical } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router'

import { useMeta } from '@/api/queries'
import { useAuth } from '@/auth/AuthProvider'
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
    <div className="border-b border-amber-200 bg-warning text-warning-foreground">
      <p className="mx-auto flex max-w-6xl items-start gap-2 px-4 py-2 text-sm">
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
    </div>
  )
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn('rounded-md px-3 py-1.5 transition-colors hover:bg-white/10', isActive && 'bg-white/15 font-medium')

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
          className="rounded-md px-3 py-1.5 transition-colors hover:bg-white/10"
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

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-background focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="bg-pitch text-pitch-foreground">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <span aria-hidden className="grid size-7 place-items-center rounded-full border-2 border-current text-xs">
              FF
            </span>
            Football Fit
          </NavLink>
          <nav aria-label="Main">
            <ul className="flex flex-wrap gap-1 text-sm">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} className={navLinkClass}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
              <AccountNav />
            </ul>
          </nav>
        </div>
      </header>
      <DataNotice />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        Fit scores are transparent ranking aids built from recorded statistics, not predictions of transfer
        success.
      </footer>
    </div>
  )
}
