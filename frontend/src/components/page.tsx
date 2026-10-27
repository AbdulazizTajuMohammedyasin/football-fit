import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { cn } from '@/lib/utils'

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>
}

/** Page body below the header, with consistent vertical rhythm. */
export function PageBody({ className, children }: { className?: string; children: ReactNode }) {
  return <Container className={cn('py-8 sm:py-10', className)}>{children}</Container>
}

/**
 * Page title block. `band` renders the pitch-night identity band used for clubs and players;
 * otherwise a quiet header on the chalk surface.
 */
export function PageHeader({
  title,
  back,
  context,
  meta,
  actions,
  band = false,
  aside,
  children,
}: {
  title: ReactNode
  back?: { to: string; label: string }
  /** Short line above the title that says what kind of page this is. */
  context?: ReactNode
  /** Provenance or facts under the title. */
  meta?: ReactNode
  actions?: ReactNode
  band?: boolean
  /** Right-hand column on wide screens (for example a code or score). */
  aside?: ReactNode
  children?: ReactNode
}) {
  return (
    <header className={cn(band ? 'pitch-band' : 'border-b bg-card')}>
      <Container className={cn('py-7 sm:py-9', band && 'sm:py-11')}>
        {back && (
          <Link
            to={back.to}
            className={cn(
              'mb-4 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium hover:underline',
              band ? 'text-pitch-muted hover:text-pitch-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <ArrowLeft className="size-4" aria-hidden />
            {back.label}
          </Link>
        )}
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <div className="min-w-0 max-w-3xl space-y-3">
            {context && (
              <div className={cn('text-sm font-medium', band ? 'text-pitch-muted' : 'text-primary')}>{context}</div>
            )}
            <h1 className="font-display text-4xl leading-[0.95] font-semibold tracking-tight break-words sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            {meta && <div className={cn('text-sm', band ? 'text-pitch-muted' : 'text-muted-foreground')}>{meta}</div>}
            {children}
          </div>
          {aside}
        </div>
        {actions && <div className="mt-6 flex flex-wrap items-center gap-2">{actions}</div>}
      </Container>
    </header>
  )
}

export function SectionHeading({
  id,
  title,
  description,
  actions,
  className,
}: {
  id?: string
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-x-6 gap-y-3', className)}>
      <div className="min-w-0 max-w-3xl space-y-1">
        <h2 id={id} className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h2>
        {description && <div className="text-sm text-muted-foreground">{description}</div>}
      </div>
      {actions}
    </div>
  )
}
