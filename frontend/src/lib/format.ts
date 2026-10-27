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

/**
 * Tailwind classes for a 0–100 score band. With `invert`, high values are bad
 * (used for need scores, where 100 means an urgent need).
 */
export function scoreTone(score: number | null | undefined, invert = false): string {
  if (score === null || score === undefined) return 'bg-muted-foreground/30'
  if (invert) score = 100 - score
  if (score >= 75) return 'bg-primary'
  if (score >= 55) return 'bg-primary/65'
  if (score >= 35) return 'bg-need-medium'
  return 'bg-need-high'
}

export function ordinal(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th'}`
}

/** "a striker", "an anchor". */
export function withArticle(noun: string): string {
  return `${/^[aeiou]/i.test(noun) ? 'an' : 'a'} ${noun}`
}
