export const DISCOVER_COACHMARK_SEEN_KEY = 'lanpm.discoverCoachmark.seen'

export function isDiscoverCoachmarkSeen(): boolean {
  try {
    return localStorage.getItem(DISCOVER_COACHMARK_SEEN_KEY) === 'true'
  } catch {
    return true
  }
}

/** Zero-group first run only. Once any group exists, the Tour mask must not cover chrome. */
export function shouldShowDiscoverCoachmark(groupsLoaded: boolean, groupCount: number): boolean {
  return groupsLoaded && groupCount === 0
}

export function markDiscoverCoachmarkSeen(): void {
  try {
    localStorage.setItem(DISCOVER_COACHMARK_SEEN_KEY, 'true')
  } catch {
    /* ignore quota / private mode */
  }
}
