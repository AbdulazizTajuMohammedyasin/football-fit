import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { cn } from '@/lib/utils'

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mx-auto w-full max-w-[75rem] px-4 sm:px-6 lg:px-8', className)}>{children}</div>
}

/** Page body below the header, with consistent vertical rhythm. */
export function PageBody({ className, children }: { className?: string; children: ReactNode }) {
  return <Container className={cn('py-8 sm:py-10', className)}>{children}</Container>
}

/**
 * Page title block. Light by default; `band` renders the compact green-ink band used for the
 * identity of a club or player.
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
  /** Short line above the title, only when it adds information the title does not carry. */
  context?: ReactNode
  /** Provenance or facts under the title. */
  meta?: ReactNode
  actions?: ReactNode
  band?: boolean
  /** Right-hand column on wide screens. */
  aside?: ReactNode
  children?: ReactNode
}) {
  return (
    <header className={cn(band ? 'bg-ink text-on-ink' : 'border-b bg-bone')}>
      <Container className="py-6 sm:py-8">
        {back && (
          <Link
            to={back.to}
            className={cn(
              'mb-5 inline-flex items-center gap-1.5 rounded-sm text-sm hover:underline',
              band ? 'text-on-ink-2 hover:text-on-ink' : 'text-ink-2 hover:text-ink',
            )}
          >
            <ArrowLeft className="size-4" aria-hidden />
            {back.label}
          </Link>
        )}
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
          <div className="min-w-0 max-w-3xl space-y-3">
            {context && <div className={cn('type-label', band ? 'text-on-ink-2' : 'text-ink-2')}>{context}</div>}
            <h1 className="type-title break-words">{title}</h1>
            {meta && <div className={cn('text-[15px]', band ? 'text-on-ink-2' : 'text-ink-2')}>{meta}</div>}
            {children}
          </div>
          {aside}
        </div>
        {actions && <div className="mt-5 flex flex-wrap items-center gap-2">{actions}</div>}
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
      <div className="min-w-0 max-w-3xl space-y-1.5">
        <h2 id={id} className="type-section">
          {title}
        </h2>
        {description && <div className="text-[15px] text-ink-2">{description}</div>}
      </div>
      {actions}
    </div>
  )
}

/**
 * The forward action: a dark mono-label button joined to a signal arrow square. Use once per
 * context, for the step that moves the user along the journey.
 */
export function ArrowLink({
  to,
  children,
  className,
  onDark = false,
}: {
  to: string
  children: ReactNode
  className?: string
  onDark?: boolean
}) {
  return (
    <Link to={to} className={cn('group inline-flex items-stretch gap-1 rounded-md', className)}>
      <span
        className={cn(
          'inline-flex h-10 items-center rounded-md px-4 font-mono text-[13px] tracking-tight transition-colors',
          onDark ? 'bg-paper text-ink group-hover:bg-tissue' : 'bg-ink text-on-ink group-hover:bg-ink/88',
        )}
      >
        {children}
      </span>
      <span className="grid size-10 place-items-center rounded-md bg-signal text-ink transition-colors group-hover:bg-signal/80">
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  )
}
