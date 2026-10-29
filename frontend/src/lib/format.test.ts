import { describe, expect, it } from 'vitest'

import { formatAge, formatMetric, formatNumber, formatScore, NOT_RECORDED, ordinal, scoreTone, withArticle } from './format'

describe('format helpers', () => {
  it('keeps missing values visibly missing instead of showing zero', () => {
    expect(formatMetric(null, 'per90')).toBe(NOT_RECORDED)
    expect(formatNumber(undefined)).toBe(NOT_RECORDED)
    expect(formatScore(null)).toBe('–')
    expect(formatAge(null)).toBe('Age unknown')
  })

  it('formats real zeros as zeros', () => {
    expect(formatMetric(0, 'per90')).toBe('0.00')
    expect(formatMetric(0, 'pct')).toBe('0.0%')
    expect(formatScore(0)).toBe('0.0')
  })

  it('builds ordinals', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 100].map(ordinal)).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '11th',
      '12th',
      '13th',
      '21st',
      '22nd',
      '100th',
    ])
  })
})

describe('scoreTone and withArticle', () => {
  it('maps scores to matchday colour bands', () => {
    expect(scoreTone(90)).toBe('bg-signal')
    expect(scoreTone(60)).toBe('bg-cyan')
    expect(scoreTone(0)).toBe('bg-ink-2/50')
    expect(scoreTone(null)).toBe('bg-ink-2/30')
  })

  it('chooses a or an', () => {
    expect(withArticle('anchor')).toBe('an anchor')
    expect(withArticle('stopper')).toBe('a stopper')
  })
})
