import { useEffect } from 'react'

/** TopBar network status poll interval (ms). */
export const NETWORK_POLL_MS = 8_000

export interface NetworkIdlePollOptions {
  /** Runs once when the effect starts (before interval). */
  onMount: () => void
  /** Runs on each interval tick and when the page becomes visible. */
  onTick: () => void
  intervalMs?: number
  enabled?: boolean
}

/**
 * Interval poll gated by Page Visibility — skips ticks while hidden;
 * refreshes once when the document becomes visible again.
 */
export function useNetworkIdlePoll({
  onMount,
  onTick,
  intervalMs = NETWORK_POLL_MS,
  enabled = true
}: NetworkIdlePollOptions): void {
  useEffect(() => {
    if (!enabled) return
    onMount()
    const tick = (): void => {
      if (document.visibilityState === 'hidden') return
      onTick()
    }
    const timer = window.setInterval(tick, intervalMs)
    const onVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') onTick()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [enabled, intervalMs, onMount, onTick])
}
