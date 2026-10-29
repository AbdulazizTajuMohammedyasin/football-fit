import { AlertCircle, Inbox } from 'lucide-react'
import type { ReactNode } from 'react'

import { Container } from '@/components/page'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function LoadingState({ label = 'Loading', rows = 4 }: { label?: string; rows?: number }) {
  return (
    <div role="status" aria-live="polite" className="space-y-2">
      <span className="sr-only">{label}…</span>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-14 w-full rounded-lg bg-tissue" />
      ))}
    </div>
  )
}

/** Loading placeholder for whole pages: a header followed by rows. */
export function PageLoading({ label, band = false }: { label: string; band?: boolean }) {
  return (
    <div>
      <div className="stadium">
        <Container className="space-y-3 py-8">
          <Skeleton className={cn('h-4 w-32', band ? 'bg-white/10' : 'bg-tissue')} />
          <Skeleton className={cn('h-12 w-72 max-w-full', band ? 'bg-white/10' : 'bg-tissue')} />
        </Container>
      </div>
      <Container className="py-8">
        <LoadingState label={label} />
      </Container>
    </div>
  )
}

export function ErrorState({
  error,
  onRetry,
  title = 'Something went wrong',
  children,
}: {
  error: unknown
  onRetry?: () => void
  title?: string
  /** Extra guidance or a working next step. */
  children?: ReactNode
}) {
  const message = error instanceof Error ? error.message : 'Unexpected error.'
  return (
    <div role="alert" className="flex gap-3 rounded-xl border border-danger/25 bg-danger-bg p-5">
      <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
      <div className="min-w-0 space-y-1.5">
        <p className="font-medium text-ink">{title}</p>
        <p className="text-[15px] text-ink-2">{message}</p>
        {children}
        {onRetry && (
          <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    </div>
  )
}

/** Error state for whole pages, kept inside the page width. */
export function PageError(props: Parameters<typeof ErrorState>[0]) {
  return (
    <Container className="py-10">
      <ErrorState {...props} />
    </Container>
  )
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-line-strong/60 bg-paper px-6 py-10">
      <Inbox className="size-5 text-ink-2" aria-hidden />
      <p className="type-sub">{title}</p>
      {children && <div className="max-w-lg text-[15px] text-ink-2">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
