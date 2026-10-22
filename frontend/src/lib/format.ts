export const NOT_RECORDED = 'Not recorded'

/** Format a metric value; null stays visibly missing instead of becoming 0. */
export function formatMetric(value: number | null | undefined, unit: 'per90' | 'pct'): string {
  if (value === null || value === undefined) return NOT_RECORDED
  return unit === 'pct' ? `${value.toFixed(1)}%` : value.toFixed(2)
}

export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined) return '–'
  return value.toFixed(1)
}

export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return NOT_RECORDED
  return value.toLocaleString('en-GB')
}

export function formatAge(age: number | null | undefined): string {
  return age === null || age === undefined ? 'Age unknown' : `${age}`
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Tailwind classes for a 0–100 score band. */
export function scoreTone(score: number | null | undefined): string {
  if (score === null || score === undefined) return 'bg-muted-foreground/30'
  if (score >= 75) return 'bg-emerald-600'
  if (score >= 55) return 'bg-emerald-500/80'
  if (score >= 35) return 'bg-amber-500'
  return 'bg-rose-500'
}
