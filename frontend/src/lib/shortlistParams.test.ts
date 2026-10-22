import { describe, expect, it } from 'vitest'

import { parseShortlistParams, toSearchParams, validateDraft } from './shortlistParams'

describe('parseShortlistParams', () => {
  it('returns null without a role', () => {
    expect(parseShortlistParams(new URLSearchParams('max_age=25'))).toBeNull()
  })

  it('reads valid filters and drops invalid ones', () => {
    const params = parseShortlistParams(
      new URLSearchParams('role=st-poacher&max_age=25&min_age=abc&min_minutes=99999&include_low_coverage=true'),
    )
    expect(params).toEqual({
      role: 'st-poacher',
      max_age: 25,
      min_age: null,
      min_minutes: null,
      include_low_coverage: true,
      include_secondary: false,
    })
  })

  it('round-trips through search params', () => {
    const params = {
      role: 'cb-stopper',
      max_age: 28,
      min_age: null,
      min_minutes: 1200,
      include_low_coverage: false,
      include_secondary: true,
    }
    expect(toSearchParams(params)).toEqual({
      role: 'cb-stopper',
      max_age: '28',
      min_minutes: '1200',
      include_secondary: 'true',
    })
    expect(parseShortlistParams(new URLSearchParams(toSearchParams(params)))).toEqual(params)
  })
})

describe('validateDraft', () => {
  it('accepts blank inputs', () => {
    expect(validateDraft({ minAge: '', maxAge: '', minMinutes: '' })).toBeNull()
  })

  it('rejects out-of-range and non-numeric values', () => {
    expect(validateDraft({ minAge: '10', maxAge: '', minMinutes: '' })).toMatch(/Minimum age/)
    expect(validateDraft({ minAge: '', maxAge: '', minMinutes: '1.5' })).toMatch(/Minimum minutes/)
  })

  it('rejects a minimum age above the maximum', () => {
    expect(validateDraft({ minAge: '30', maxAge: '25', minMinutes: '' })).toMatch(/cannot be greater/)
  })
})
