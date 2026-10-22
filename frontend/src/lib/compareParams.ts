export const MAX_PLAYERS = 4

/** Parse a comma-separated player list from the URL: trimmed, de-duplicated, capped. */
export function parsePlayers(value: string | null): string[] {
  if (!value) return []
  return [...new Set(value.split(',').map((slug) => slug.trim()).filter(Boolean))].slice(0, MAX_PLAYERS)
}
