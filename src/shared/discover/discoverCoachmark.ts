export const DISCOVER_COACHMARK_SEEN_KEY = 'lanpm.discoverCoachmark.seen'

export function isDiscoverCoachmarkSeen(): boolean {
  try {
    return localStorage.getItem(DISCOVER_COACHMARK_SEEN_KEY) === 'true'
  } catch {
    return true
  }
}

export function markDiscoverCoachmarkSeen(): void {
  try {
    localStorage.setItem(DISCOVER_COACHMARK_SEEN_KEY, 'true')
  } catch {
    /* ignore quota / private mode */
  }
}
