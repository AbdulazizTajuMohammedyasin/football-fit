import { describe, expect, it } from 'vitest'

import { safeNext } from './safeNext'

describe('safeNext', () => {
  it('keeps in-app paths', () => {
    expect(safeNext('/clubs/arsenal/shortlist?role=fw-finisher')).toBe('/clubs/arsenal/shortlist?role=fw-finisher')
  })

  it('rejects external or missing targets', () => {
    for (const value of [null, '', 'https://evil.example', '//evil.example', '/\\evil.example']) {
      expect(safeNext(value)).toBe('/shortlists')
    }
  })
})
