import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'

import { useAuth } from '@/auth/AuthProvider'
import { PageBody } from '@/components/page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { safeNext } from '@/lib/safeNext'

export function AuthPage({ mode }: { mode: 'signin' | 'signup' }) {
  const { user, signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = safeNext(searchParams.get('next'))
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to={next} replace />

  const signingUp = mode === 'signup'

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!username.trim() || !password || (signingUp && !email.trim())) {
      setError('Please fill in every field.')
      return
    }
    setSubmitting(true)
    try {
      if (signingUp) await signUp(username.trim(), email.trim(), password)
      else await signIn(username.trim(), password)
      navigate(next, { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.'
      setError(
        !signingUp && message.includes('No active account')
          ? 'That username and password do not match an account.'
          : message,
      )
    } finally {
      setSubmitting(false)
    }
  }

  const otherLink = `${signingUp ? '/signin' : '/signup'}?next=${encodeURIComponent(next)}`

  return (
    <PageBody className="py-10 sm:py-16">
      <div className="mx-auto grid max-w-4xl overflow-hidden rounded-xl border bg-card md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <aside className="pitch-band order-2 space-y-5 p-7 sm:p-9 md:order-1">
          <p className="font-display text-2xl leading-tight font-semibold">
            {signingUp ? 'Keep the players worth a second look.' : 'Welcome back to your shortlists.'}
          </p>
          <ul className="space-y-3 text-sm text-pitch-muted">
            <li>Save players from any shortlist or profile into named lists.</li>
            <li>Reopen a list later with its club and role, or compare its players.</li>
            <li>Clubs, needs, shortlists and comparisons all work without an account.</li>
          </ul>
        </aside>
        <div className="order-1 space-y-6 p-7 sm:p-9 md:order-2">
          <header className="space-y-1">
            <h1 className="font-display text-4xl font-semibold tracking-tight">
              {signingUp ? 'Create an account' : 'Sign in'}
            </h1>
            <p className="text-sm text-muted-foreground">
              An account lets you save shortlists. Everything else works without one.
            </p>
          </header>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
            {signingUp && (
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={signingUp ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              {signingUp && (
                <p className="text-xs text-muted-foreground">At least 8 characters, not entirely numbers or common.</p>
              )}
            </div>
            {error && (
              <p role="alert" className="rounded-md border border-destructive/30 bg-need-high-soft px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Please wait…' : signingUp ? 'Create account' : 'Sign in'}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground">
            {signingUp ? 'Already have an account?' : 'New to Football Fit?'}{' '}
            <Link to={otherLink} className="font-medium text-primary hover:underline">
              {signingUp ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
        </div>
      </div>
    </PageBody>
  )
}
