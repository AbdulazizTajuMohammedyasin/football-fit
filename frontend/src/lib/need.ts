/** Need levels as filled meter segments (out of three). The level word is always shown too. */
export const NEED_SEGMENTS: Record<string, number> = { high: 3, medium: 2, low: 1, unknown: 0 }

export function needLabel(level: string): string {
  return level === 'unknown' ? 'Unknown need' : `${level[0].toUpperCase()}${level.slice(1)} need`
}
