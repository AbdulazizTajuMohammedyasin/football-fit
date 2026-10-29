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
 * Page title block on the floodlit stadium band; `band` adds room for the identity of a club or player.
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
    <header className="stadium">
      <Container className={band ? 'py-8 sm:py-12' : 'py-8 sm:py-10'}>
        {back && (
          <Link
            to={back.to}
            className={cn(
              'mb-5 inline-flex items-center gap-1.5 rounded-sm text-sm hover:underline',
              'text-ink-2 hover:text-ink',
            )}
          >
            <ArrowLeft className="size-4" aria-hidden />
            {back.label}
          </Link>
        )}
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
          <div className="min-w-0 max-w-3xl space-y-3">
            {context && <div className="type-label text-ink-2">{context}</div>}
            <h1 className="type-title break-words">{title}</h1>
            {meta && <div className="text-[15px] text-ink-2">{meta}</div>}
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
 * The forward action: a glowing lime button with an arrow. Use once per context, for the step
 * that moves the user along the journey. `onDark` is accepted for callers; it reads on any surface.
 */
export function ArrowLink({
  to,
  children,
  className,
}: {
  to: string
  children: ReactNode
  className?: string
  onDark?: boolean
}) {
  return (
    <Link
      to={to}
      className={cn(
        'group inline-flex h-11 items-center gap-3 rounded-md bg-signal pr-1.5 pl-4 font-mono text-[13px] font-medium tracking-wide text-on-ink uppercase shadow-[0_0_28px_-8px_var(--signal)] transition-shadow hover:shadow-[0_0_36px_-4px_var(--signal)]',
        className,
      )}
    >
      {children}
      <span className="grid size-8 place-items-center rounded-sm bg-on-ink text-signal">
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  )
}
