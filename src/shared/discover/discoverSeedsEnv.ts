import { normalizeDiscoverSeeds } from './discoverSeeds.ts'

/** Split `LANPM_DISCOVER_SEEDS` (comma/semicolon/whitespace). */
export function parseDiscoverSeedsEnv(raw: string | undefined | null): string[] {
  if (raw == null) return []
  const trimmed = String(raw).trim()
  if (!trimmed) return []
  const parts = trimmed.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean)
  return normalizeDiscoverSeeds(parts)
}
