/** Voice message limits (meeting-media-v2). */
export const VOICE_MESSAGE_MAX_MS = 60_000

export function formatVoiceDuration(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
