/** Tailwind classes per need level. Colour always travels with a written label. */
export const NEED_STYLES: Record<string, { badge: string; fill: string; soft: string }> = {
  high: { badge: 'border-need-high/30 bg-need-high-soft text-need-high', fill: 'bg-need-high', soft: 'bg-need-high-soft' },
  medium: {
    badge: 'border-need-medium/30 bg-need-medium-soft text-need-medium',
    fill: 'bg-need-medium',
    soft: 'bg-need-medium-soft',
  },
  low: { badge: 'border-need-low/30 bg-need-low-soft text-need-low', fill: 'bg-need-low', soft: 'bg-need-low-soft' },
  unknown: { badge: 'bg-muted text-muted-foreground', fill: 'bg-muted-foreground/40', soft: 'bg-muted' },
}

export function needLabel(level: string): string {
  return level === 'unknown' ? 'Unknown need' : `${level[0].toUpperCase()}${level.slice(1)} need`
}
