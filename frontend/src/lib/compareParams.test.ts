import { describe, expect, it } from 'vitest'

import { parsePlayers } from './compareParams'

describe('parsePlayers', () => {
  it('handles empty input', () => {
    expect(parsePlayers(null)).toEqual([])
    expect(parsePlayers('')).toEqual([])
  })

  it('trims, removes duplicates and caps at four players', () => {
    expect(parsePlayers(' a, b,a,,c,d,e ')).toEqual(['a', 'b', 'c', 'd'])
  })
})
