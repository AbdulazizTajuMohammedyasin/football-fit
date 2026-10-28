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
      <div className="mx-auto max-w-[26rem] space-y-6">
        <header className="space-y-2">
          <h1 className="type-title">{signingUp ? 'Create an account' : 'Sign in'}</h1>
          <p className="text-[15px] text-ink-2">
            An account lets you save shortlists. Everything else works without one.
          </p>
        </header>
        <form onSubmit={submit} className="space-y-4 rounded-xl border bg-paper p-6" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-sm font-normal">
              Username
            </Label>
            <Input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>
          {signingUp && (
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-normal">
                Email
              </Label>
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
            <Label htmlFor="password" className="text-sm font-normal">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete={signingUp ? 'new-password' : 'current-password'}
              value={password}
              aria-describedby={signingUp ? 'password-hint' : undefined}
              onChange={(event) => setPassword(event.target.value)}
            />
            {signingUp && (
              <p id="password-hint" className="text-sm text-ink-2">
                At least 8 characters, not entirely numbers or common.
              </p>
            )}
          </div>
          {error && (
            <p role="alert" className="rounded-lg border border-danger/25 bg-danger-bg px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={submitting} aria-busy={submitting}>
            {submitting ? 'Please wait…' : signingUp ? 'Create account' : 'Sign in'}
          </Button>
        </form>
        <p className="text-[15px] text-ink-2">
          {signingUp ? 'Already have an account?' : 'New to Football Fit?'}{' '}
          <Link to={otherLink} className="text-ink underline underline-offset-4">
            {signingUp ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
      </div>
    </PageBody>
  )
}
