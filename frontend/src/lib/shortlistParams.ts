import type { ShortlistParams } from '@/api/queries'

export const AGE_MIN = 15
export const AGE_MAX = 45
export const DEFAULT_MIN_MINUTES = 900

function parseInteger(value: string | null, min: number, max: number): number | null {
  if (value === null || value.trim() === '') return null
  if (!/^\d+$/.test(value.trim())) return null
  const number = Number(value)
  return number >= min && number <= max ? number : null
}

/** Read shortlist filters from the URL, dropping anything invalid instead of guessing. */
export function parseShortlistParams(search: URLSearchParams): ShortlistParams | null {
  const role = search.get('role')
  if (!role) return null
  return {
    role,
    max_age: parseInteger(search.get('max_age'), AGE_MIN, AGE_MAX),
    min_age: parseInteger(search.get('min_age'), AGE_MIN, AGE_MAX),
    min_minutes: parseInteger(search.get('min_minutes'), 0, 5000),
    include_low_coverage: search.get('include_low_coverage') === 'true',
    include_secondary: search.get('include_secondary') === 'true',
  }
}

export function toSearchParams(params: ShortlistParams): Record<string, string> {
  const out: Record<string, string> = { role: params.role }
  if (params.max_age != null) out.max_age = String(params.max_age)
  if (params.min_age != null) out.min_age = String(params.min_age)
  if (params.min_minutes != null) out.min_minutes = String(params.min_minutes)
  if (params.include_low_coverage) out.include_low_coverage = 'true'
  if (params.include_secondary) out.include_secondary = 'true'
  return out
}

export interface FilterDraft {
  minAge: string
  maxAge: string
  minMinutes: string
}

/** Validate the free-text filter inputs; returns an error message or null. */
export function validateDraft(draft: FilterDraft): string | null {
  for (const [label, value, min, max] of [
    ['Minimum age', draft.minAge, AGE_MIN, AGE_MAX],
    ['Maximum age', draft.maxAge, AGE_MIN, AGE_MAX],
    ['Minimum minutes', draft.minMinutes, 0, 5000],
  ] as const) {
    if (value.trim() !== '' && parseInteger(value, min, max) === null) {
      return `${label} must be a whole number between ${min} and ${max}.`
    }
  }
  const minAge = parseInteger(draft.minAge, AGE_MIN, AGE_MAX)
  const maxAge = parseInteger(draft.maxAge, AGE_MIN, AGE_MAX)
  if (minAge !== null && maxAge !== null && minAge > maxAge) {
    return 'Minimum age cannot be greater than maximum age.'
  }
  return null
}
