import { AlertCircle, Inbox } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function LoadingState({ label = 'Loading', rows = 4 }: { label?: string; rows?: number }) {
  return (
    <div role="status" aria-live="polite" className="space-y-2">
      <span className="sr-only">{label}…</span>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-16 w-full rounded-md bg-muted" />
      ))}
    </div>
  )
}

/** Loading placeholder for whole pages: a header band followed by rows. */
export function PageLoading({ label, band = false }: { label: string; band?: boolean }) {
  return (
    <div>
      <div className={cn(band ? 'pitch-band' : 'border-b bg-card')}>
        <div className="mx-auto max-w-7xl space-y-3 px-4 py-10 sm:px-6 lg:px-8">
          <Skeleton className={cn('h-4 w-32', band ? 'bg-white/10' : 'bg-muted')} />
          <Skeleton className={cn('h-12 w-72 max-w-full', band ? 'bg-white/10' : 'bg-muted')} />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <LoadingState label={label} />
      </div>
    </div>
  )
}

export function ErrorState({
  error,
  onRetry,
  title = 'Something went wrong',
}: {
  error: unknown
  onRetry?: () => void
  title?: string
}) {
  const message = error instanceof Error ? error.message : 'Unexpected error.'
  return (
    <div
      role="alert"
      className="flex gap-3 rounded-md border border-destructive/30 border-l-4 border-l-destructive bg-card p-4"
    >
      <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
      <div className="min-w-0 space-y-1">
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{message}</p>
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
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <ErrorState {...props} />
    </div>
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
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-input bg-card/60 px-6 py-12 text-center">
      <Inbox className="size-6 text-muted-foreground" aria-hidden />
      <p className="font-display text-xl font-semibold">{title}</p>
      {children && <div className="max-w-md text-sm text-muted-foreground">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
